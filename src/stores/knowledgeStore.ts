import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import { calculateReviewDates, advanceStage, handleError } from '@/engine/ebbinghaus';
import type { KnowledgePoint } from '@/types';

interface ReviewResult {
  isCorrect: boolean;
  newStage: number;
  action: string;
  message: string;
}

interface KnowledgeState {
  addKnowledgePoint: (data: { personaId: string; subjectId: string; name: string; studyDate: number }) => Promise<string>;
  submitReview: (id: string, rating: number, allowSkip?: boolean) => Promise<ReviewResult>;
  requestSkip: (id: string) => Promise<ReviewResult>;
  getDueReviews: (personaId: string) => Promise<KnowledgePoint[]>;
  getAllKnowledgePoints: (personaId: string) => Promise<KnowledgePoint[]>;
  deleteKnowledgePoint: (id: string) => Promise<void>;
  shiftAllDates: (personaId: string, days: number) => Promise<void>;
}

export const useKnowledgeStore = create<KnowledgeState>(() => ({
  addKnowledgePoint: async (data) => {
    const id = generateId();
    const now = Date.now();
    const reviewDates = calculateReviewDates(data.studyDate);
    const point: KnowledgePoint = {
      ...data,
      id,
      currentStage: 0,
      nextReviewDate: reviewDates[0],
      reviewDates,
      consecutiveCorrect: 0,
      masteryRating: 0,
      errorCount: 0,
      errorAtStage: -1,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await db.knowledgePoints.add(point);
    return id;
  },

  submitReview: async (id, rating, allowSkip = false) => {
    const point = await db.knowledgePoints.get(id);
    if (!point) throw new Error('知识点未找到');

    const isCorrect = rating >= 4;
    const result = isCorrect
      ? advanceStage(point, allowSkip)
      : handleError(point);

    await db.knowledgePoints.update(id, {
      ...result,
      masteryRating: rating,
      updatedAt: Date.now(),
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
}));
