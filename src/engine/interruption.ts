import { db } from '@/db';
import type { Block } from '@/types';
import { startOfDayEpoch } from '@/utils/date';

/** Mode 1: Reduce today to max N minutes, keeping mandatory tasks first */
export async function trimToMinutes(
  personaId: string,
  date: number,
  maxMinutes: number
): Promise<{ kept: Block[]; removed: Block[] }> {
  const blocks = await db.blocks
    .where({ personaId, date })
    .filter(b => b.status === 'scheduled' || b.status === 'in_progress')
    .toArray();

  const mandatory = blocks.filter(
    b => b.type === 'review' || b.type === 'error_problem'
  );
  const optional = blocks.filter(
    b => b.type === 'new_learning' || b.type === 'exercise'
  );

  const mandatoryMinutes = mandatory.reduce((s, b) => s + b.estimatedDurationMinutes, 0);
  const remaining = maxMinutes - mandatoryMinutes;

  if (remaining < 0) {
    // Even mandatory exceeds limit - keep what fits
    let running = 0;
    const kept: Block[] = [];
    for (const b of mandatory) {
      if (running + b.estimatedDurationMinutes <= maxMinutes) {
        kept.push(b);
        running += b.estimatedDurationMinutes;
      }
    }
    const removed = [...mandatory.filter(b => !kept.includes(b)), ...optional];
    for (const b of removed) {
      await db.blocks.update(b.id, { status: 'skipped' });
    }
    return { kept, removed };
  }

  // Trim optional by priority (keep in order, stop when budget exhausted)
  let running = 0;
  const kept: Block[] = [];
  for (const b of optional) {
    if (running + b.estimatedDurationMinutes <= remaining) {
      kept.push(b);
      running += b.estimatedDurationMinutes;
    } else {
      await db.blocks.update(b.id, { status: 'skipped' });
    }
  }

  const removed = optional.filter(b => !kept.includes(b));
  return { kept: [...mandatory, ...kept], removed };
}

/** Mode 2: Shift all dates forward by N days */
export async function shiftAllDates(personaId: string, days: number): Promise<void> {
  const msShift = days * 86400000;

  // Shift knowledge point review dates
  const points = await db.knowledgePoints
    .where({ personaId, status: 'active' })
    .toArray();
  for (const p of points) {
    await db.knowledgePoints.update(p.id, {
      nextReviewDate: p.nextReviewDate + msShift,
      reviewDates: p.reviewDates.map(d => d + msShift),
      updatedAt: Date.now(),
    });
  }

  // Shift error problem dates
  const errors = await db.errorProblems
    .where({ personaId })
    .filter(e => e.status !== 'cleared')
    .toArray();
  for (const e of errors) {
    await db.errorProblems.update(e.id, {
      nextReviewDate: e.nextReviewDate + msShift,
    });
  }

  // Cancel all future scheduled blocks
  const today = startOfDayEpoch();
  const futureBlocks = await db.blocks
    .where({ personaId })
    .filter(b => b.date >= today && b.status === 'scheduled')
    .toArray();
  for (const b of futureBlocks) {
    await db.blocks.update(b.id, { status: 'cancelled' });
  }
}

/** Mode 3: Check if today is a recovery day (day after interruption) */
export function isRecoveryDay(
  lastInterruptionDate: number | null,
  today: number
): boolean {
  if (!lastInterruptionDate) return false;
  const daysSinceInterruption = Math.floor((today - lastInterruptionDate) / 86400000);
  return daysSinceInterruption >= 1 && daysSinceInterruption <= 1;
}

/** Distribute skipped blocks to future days (max 10% extra per day) */
export async function redistributeSkippedBlocks(
  personaId: string,
  skippedBlockIds: string[]
): Promise<void> {
  if (skippedBlockIds.length === 0) return;

  let dayOffset = 1;
  let blockIdx = 0;
  const today = startOfDayEpoch();

  while (blockIdx < skippedBlockIds.length) {
    const targetDate = today + dayOffset * 86400000;
    const existingCount = await db.blocks
      .where({ personaId, date: targetDate })
      .count();

    // Allow up to 10% more than a typical day
    const maxExtraPerDay = Math.max(1, Math.round(existingCount * 0.1));
    let added = 0;

    while (added < maxExtraPerDay && blockIdx < skippedBlockIds.length) {
      const blockId = skippedBlockIds[blockIdx];
      await db.blocks.update(blockId, {
        date: targetDate,
        status: 'scheduled',
      });
      blockIdx++;
      added++;
    }

    dayOffset++;
    if (dayOffset > 30) break; // Don't go beyond 30 days
  }
}
