import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import { calculateReviewDates, advanceStage, handleError, repairKnowledgePoint, DAY_MS } from '@/engine/ebbinghaus';
import type { KnowledgePoint } from '@/types';

interface ReviewResult {
  isCorrect: boolean;
  newStage: number;
  action: string;
  message: string;
}

interface KnowledgeState {
  addKnowledgePoint: (data: { personaId: string; subjectId: string; name: string; studyDate: number; reviewDurationMinutes?: number; initialStage?: number; enabledStages?: boolean[]; knowledgeGroupId?: string }) => Promise<string>;
  updateKnowledgePoint: (id: string, partial: Partial<KnowledgePoint>) => Promise<void>;
  updateReviewDuration: (id: string, minutes: number) => Promise<void>;
  submitReview: (id: string, rating: number, allowSkip?: boolean) => Promise<ReviewResult>;
  requestSkip: (id: string) => Promise<ReviewResult>;
  getDueReviews: (personaId: string) => Promise<KnowledgePoint[]>;
  getAllKnowledgePoints: (personaId: string) => Promise<KnowledgePoint[]>;
  deleteKnowledgePoint: (id: string) => Promise<void>;
  shiftAllDates: (personaId: string, days: number) => Promise<void>;
  repairAllKnowledgePoints: (personaId: string) => Promise<number>;
  restartFromStage: (id: string, fromStage: number) => Promise<void>;
  syncCompletionRecords: (personaId: string) => Promise<number>;
}

export const useKnowledgeStore = create<KnowledgeState>(() => ({
  addKnowledgePoint: async (data) => {
    const id = generateId();
    const now = Date.now();
    const reviewDates = calculateReviewDates(data.studyDate);
    const stage = Math.min(data.initialStage ?? 0, 10);
    const point: KnowledgePoint = {
      ...data,
      id,
      knowledgeGroupId: data.knowledgeGroupId,
      currentStage: stage,
      nextReviewDate: stage >= 10 ? reviewDates[9] : reviewDates[stage],
      reviewDates,
      reviewDurationMinutes: data.reviewDurationMinutes || 10,
      consecutiveCorrect: stage,
      masteryRating: 0,
      errorCount: 0,
      errorAtStage: -1,
      status: stage >= 10 ? 'completed' : 'active',
      createdAt: now,
      updatedAt: now,
    };
    await db.knowledgePoints.add(point);
    return id;
  },

  submitReview: async (id, rating, allowSkip = false) => {
    const point = await db.knowledgePoints.get(id);
    if (!point) throw new Error('知识点未找到');

    // Guard: cannot complete a review whose scheduled date is still in the future
    if (point.nextReviewDate > Date.now() + 60_000) {
      throw new Error('该复习节点尚未到期，无法提前完成');
    }

    const isCorrect = rating >= 4;
    const completedStage = point.currentStage;
    const result = isCorrect
      ? advanceStage(point, allowSkip)
      : handleError(point);

    // Record the actual completion timestamp for this stage
    const now = Date.now();
    const sca = point.stageCompletedAt && point.stageCompletedAt.length === 10
      ? [...point.stageCompletedAt]
      : Array.from({ length: 10 }, () => null as number | null);
    if (completedStage >= 0 && completedStage < 10) {
      sca[completedStage] = now;
    }

    await db.knowledgePoints.update(id, {
      ...result,
      stageCompletedAt: sca,
      masteryRating: rating,
      updatedAt: now,
    });

    return { isCorrect, newStage: result.currentStage, action: result.action, message: result.message };
  },

  requestSkip: async (id) => {
    const point = await db.knowledgePoints.get(id);
    if (!point) throw new Error('知识点未找到');

    const result = advanceStage(point, true);
    await db.knowledgePoints.update(id, {
      ...result,
      masteryRating: point.masteryRating,
      updatedAt: Date.now(),
    });

    return { isCorrect: true, newStage: result.currentStage, action: result.action, message: result.message };
  },

  getDueReviews: async (personaId) => {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const endMs = todayEnd.getTime();

    return db.knowledgePoints
      .where({ personaId, status: 'active' })
      .filter(kp => kp.nextReviewDate <= endMs)
      .toArray();
  },

  getAllKnowledgePoints: async (personaId) => {
    return db.knowledgePoints
      .where({ personaId })
      .reverse()
      .sortBy('createdAt');
  },

  deleteKnowledgePoint: async (id) => {
    await db.knowledgePoints.delete(id);
  },

  updateKnowledgePoint: async (id, partial) => {
    await db.knowledgePoints.update(id, {
      ...partial,
      updatedAt: Date.now(),
    });
  },

  updateReviewDuration: async (id, minutes) => {
    await db.knowledgePoints.update(id, {
      reviewDurationMinutes: minutes,
      updatedAt: Date.now(),
    });
  },

  shiftAllDates: async (personaId, days) => {
    const points = await db.knowledgePoints
      .where({ personaId, status: 'active' })
      .toArray();
    const msToShift = days * 86400000;
    for (const p of points) {
      await db.knowledgePoints.update(p.id, {
        nextReviewDate: p.nextReviewDate + msToShift,
        reviewDates: p.reviewDates.map(d => d + msToShift),
        updatedAt: Date.now(),
      });
    }
  },

  repairAllKnowledgePoints: async (personaId) => {
    const points = await db.knowledgePoints
      .where({ personaId })
      .toArray();
    let repairedCount = 0;
    for (const p of points) {
      const result = repairKnowledgePoint(p);
      if (result.wasBroken || result.reviewDates.join(',') !== p.reviewDates.join(',') || result.nextReviewDate !== p.nextReviewDate) {
        await db.knowledgePoints.update(p.id, {
          reviewDates: result.reviewDates,
          nextReviewDate: result.nextReviewDate,
          updatedAt: Date.now(),
        });
        repairedCount++;
      }
    }
    return repairedCount;
  },

  /** Explicitly restart review from an earlier stage (user fell behind). */
  restartFromStage: async (id, fromStage) => {
    const point = await db.knowledgePoints.get(id);
    if (!point) throw new Error('知识点未找到');

    const theoretical = calculateReviewDates(point.studyDate);
    // Clear completion records from the restart stage onward
    const sca = point.stageCompletedAt && point.stageCompletedAt.length === 10
      ? [...point.stageCompletedAt]
      : Array.from({ length: 10 }, () => null as number | null);
    for (let i = fromStage; i < 10; i++) {
      sca[i] = null;
    }

    const now = Date.now();
    const theoreticalDate = theoretical[fromStage];
    const nextReviewDate = theoreticalDate < now ? now + DAY_MS : theoreticalDate;

    await db.knowledgePoints.update(id, {
      currentStage: fromStage,
      nextReviewDate,
      stageCompletedAt: sca,
      restartedFromStage: fromStage,
      errorCount: 0,
      errorAtStage: -1,
      consecutiveCorrect: 0,
      status: 'active',
      updatedAt: now,
    });
  },

  /** Sync stageCompletedAt from completed review blocks into knowledge points. */
  syncCompletionRecords: async (personaId) => {
    // Fetch ALL completed blocks for this persona (not just review type, in
    // case some blocks have the wrong type). We filter by name pattern below.
    const blocks = await db.blocks
      .where({ personaId, status: 'completed' })
      .toArray();

    // Group by KP ID: for each KP, collect { stageIndex, completedAt }
    const byKp = new Map<string, { stageIndex: number; completedAt: number }[]>();
    for (const b of blocks) {
      // Try to get KP IDs from the block's knowledgePointIds field
      const kpIds: string[] = b.knowledgePointIds || [];
      if (kpIds.length === 0) continue;

      // Parse R number from block name like "R3 知识点名" or "R10 xxx"
      const rMatch = b.name.match(/R(\d+)\s/);
      if (!rMatch) continue;
      const stageIndex = Number(rMatch[1]) - 1; // R3 → index 2
      if (stageIndex < 0 || stageIndex >= 10 || !b.completedAt) continue;

      for (const kpId of kpIds) {
        if (!byKp.has(kpId)) byKp.set(kpId, []);
        byKp.get(kpId)!.push({ stageIndex, completedAt: b.completedAt });
      }
    }

    let synced = 0;
    for (const [kpId, records] of byKp) {
      const kp = await db.knowledgePoints.get(kpId);
      if (!kp) continue;
      const sca = kp.stageCompletedAt && kp.stageCompletedAt.length === 10
        ? [...kp.stageCompletedAt]
        : Array.from({ length: 10 }, () => null as number | null);

      let changed = false;
      for (const rec of records) {
        if (sca[rec.stageIndex] === null) {
          sca[rec.stageIndex] = rec.completedAt;
          changed = true;
        }
      }
      if (changed) {
        await db.knowledgePoints.update(kpId, { stageCompletedAt: sca, updatedAt: Date.now() });
        synced++;
      }
    }
    return synced;
  },
}));
