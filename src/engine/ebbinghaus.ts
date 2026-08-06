import type { KnowledgePoint } from '@/types';
import { REVIEW_INTERVALS } from './constants';

export const DAY_MS = 86400000;

// ═══════════════════════════════════════════════════════════════════════════
// Repair — detect & fix corrupted reviewDates
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Repair a knowledge point's reviewDates if corrupted by old buggy algorithms.
 * Detects:
 * 1. Old absolute-offset algorithm (R2 date = studyDate + 2 days)
 * 2. Double-interval corruption from buggy projectFutureDates
 *
 * Repair rebuilds reviewDates from studyDate (theoretical) and leaves
 * nextReviewDate untouched (it's dynamically computed by advanceStage).
 */
export function repairKnowledgePoint(point: KnowledgePoint): {
  reviewDates: number[];
  nextReviewDate: number;
  wasBroken: boolean;
} {
  const theoretical = calculateReviewDates(point.studyDate);
  const stored = point.reviewDates;

  // Detection #1: old absolute-offset algorithm
  const oldR2 = point.studyDate + 2 * DAY_MS;
  const actualR2 = stored.length === 10 ? stored[1] : 0;
  const broken1 = stored.length === 10
    && Math.abs(actualR2 - oldR2) < DAY_MS
    && Math.abs(actualR2 - theoretical[1]) >= DAY_MS;

  // Detection #2: double-interval corruption
  // The stored date for the current stage is significantly further
  // in the future than nextReviewDate suggests.
  let broken2 = false;
  if (!broken1 && stored.length === 10 && point.currentStage < 10) {
    const storedStageDate = stored[point.currentStage];
    const expectedGap = point.nextReviewDate - Date.now();
    const storedGap = storedStageDate - Date.now();
    if (expectedGap > 0 && storedGap > expectedGap * 1.5) {
      broken2 = true;
    }
  }

  // Detection #3: reviewDates contain future timestamps that are clearly
  // wrong (e.g. a past or current stage has a date far in the future)
  let broken3 = false;
  if (!broken1 && !broken2 && stored.length === 10) {
    for (let i = 0; i <= point.currentStage && i < 10; i++) {
      if (stored[i] > Date.now() + 30 * DAY_MS) {
        broken3 = true;
        break;
      }
    }
  }

  if (broken1 || broken2 || broken3) {
    return {
      reviewDates: theoretical,
      nextReviewDate: broken1 ? theoretical[Math.min(point.currentStage, 9)] : point.nextReviewDate,
      wasBroken: true,
    };
  }

  return { reviewDates: point.reviewDates, nextReviewDate: point.nextReviewDate, wasBroken: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// Pure helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Build cumulative review dates from a start date (theoretical schedule). */
export function calculateReviewDates(fromDate: number): number[] {
  const dates: number[] = [];
  let cursor = fromDate;
  for (const days of REVIEW_INTERVALS) {
    cursor = cursor + days * DAY_MS;
    dates.push(cursor);
  }
  return dates;
}

/**
 * Compute the date that SHOULD appear on the calendar for a given stage.
 * For past stages (i < currentStage): the theoretical date.
 * For the current stage (i === currentStage): the actual nextReviewDate.
 * For future stages (i > currentStage): projected from nextReviewDate.
 */
export function projectedStageDate(
  kp: KnowledgePoint,
  stageIndex: number,
): number {
  const theoretical = calculateReviewDates(kp.studyDate);
  if (stageIndex < kp.currentStage) {
    return theoretical[stageIndex];
  }
  if (stageIndex === kp.currentStage) {
    return kp.nextReviewDate;
  }
  // Future: start from nextReviewDate and accumulate intervals
  let cursor = kp.nextReviewDate;
  for (let i = kp.currentStage + 1; i <= stageIndex && i < REVIEW_INTERVALS.length; i++) {
    cursor = cursor + REVIEW_INTERVALS[i] * DAY_MS;
  }
  return cursor;
}

// ═══════════════════════════════════════════════════════════════════════════
// Stage advancement
// ═══════════════════════════════════════════════════════════════════════════

export interface StageResult {
  currentStage: number;
  nextReviewDate: number;
  reviewDates: number[];
  consecutiveCorrect: number;
  errorCount: number;
  errorAtStage: number;
  status: 'active' | 'completed';
  action: 'advanced' | 'completed' | 'makeup' | 'downgraded' | 'reset';
  message: string;
}

/**
 * Correct review → advance to next stage.
 * reviewDates stay as theoretical reference — only nextReviewDate is
 * computed dynamically based on actual review time.
 */
export function advanceStage(point: KnowledgePoint, allowSkip: boolean = false): StageResult {
  const newConsecutive = point.consecutiveCorrect + 1;
  let nextStage = point.currentStage + 1;

  if (allowSkip && newConsecutive >= 3 && nextStage < REVIEW_INTERVALS.length) {
    nextStage = Math.min(nextStage + 1, REVIEW_INTERVALS.length);
  }

  if (point.enabledStages && point.enabledStages.length === 10) {
    while (nextStage < 10 && !point.enabledStages[nextStage]) {
      nextStage++;
    }
  }

  // Keep reviewDates as theoretical from studyDate
  const reviewDates = point.reviewDates.length === 10
    ? point.reviewDates
    : calculateReviewDates(point.studyDate);

  if (nextStage >= REVIEW_INTERVALS.length) {
    return {
      currentStage: REVIEW_INTERVALS.length,
      nextReviewDate: reviewDates[9],
      reviewDates,
      consecutiveCorrect: newConsecutive,
      errorCount: 0,
      errorAtStage: 0,
      status: 'completed',
      action: 'completed',
      message: '全部复习完成！',
    };
  }

  return {
    currentStage: nextStage,
    nextReviewDate: Date.now() + REVIEW_INTERVALS[nextStage] * DAY_MS,
    reviewDates,
    consecutiveCorrect: newConsecutive,
    errorCount: 0,
    errorAtStage: 0,
    status: 'active',
    action: 'advanced',
    message: allowSkip && newConsecutive >= 3
      ? `连续 ${newConsecutive} 次正确，已跳过一级`
      : `推进到 R${nextStage + 1}`,
  };
}

/**
 * Error review → makeup / downgrade / reset.
 * reviewDates stay theoretical — only stage & nextReviewDate change.
 */
export function handleError(point: KnowledgePoint): StageResult {
  const stage = point.currentStage;
  const newErrorCount = (point.errorAtStage === stage ? point.errorCount : 0) + 1;
  const now = Date.now();

  const reviewDates = point.reviewDates.length === 10
    ? point.reviewDates
    : calculateReviewDates(point.studyDate);

  // 3+ errors at same stage → reset to R1
  if (newErrorCount >= 3) {
    return {
      currentStage: 0,
      nextReviewDate: now + REVIEW_INTERVALS[0] * DAY_MS,
      reviewDates,
      consecutiveCorrect: 0,
      errorCount: 0,
      errorAtStage: 0,
      status: 'active',
      action: 'reset',
      message: '同一节点连续 3 次出错，已重置回 R1',
    };
  }

  // 2 errors at same stage → downgrade one stage
  if (newErrorCount >= 2) {
    const ds = Math.max(0, stage - 1);
    return {
      currentStage: ds,
      nextReviewDate: now + REVIEW_INTERVALS[ds] * DAY_MS,
      reviewDates,
      consecutiveCorrect: 0,
      errorCount: 0,
      errorAtStage: 0,
      status: 'active',
      action: 'downgraded',
      message: `同一节点连续 2 次出错，已降级到 R${ds + 1}`,
    };
  }

  // First error → makeup review tomorrow
  return {
    currentStage: stage,
    nextReviewDate: now + DAY_MS,
    reviewDates,
    consecutiveCorrect: 0,
    errorCount: newErrorCount,
    errorAtStage: stage,
    status: 'active',
    action: 'makeup',
    message: `在 R${stage + 1} 插入补练复习，明天再巩固一次`,
  };
}
