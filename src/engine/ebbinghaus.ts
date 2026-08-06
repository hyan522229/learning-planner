import type { KnowledgePoint } from '@/types';
import { REVIEW_INTERVALS } from './constants';

export const DAY_MS = 86400000;

/**
 * Repair a knowledge point's reviewDates if corrupted by old algorithms.
 * Two known corruptions are detected:
 * 1. Old absolute-offset algorithm (R2 date = studyDate + 2 days).
 * 2. Double-interval bug in projectFutureDates (future dates shifted too far).
 *
 * Repair rebuilds reviewDates from nextReviewDate forward so the calendar
 * shows correct projected dates. Does NOT change nextReviewDate itself.
 */
export function repairKnowledgePoint(point: KnowledgePoint): {
  reviewDates: number[];
  nextReviewDate: number;
  wasBroken: boolean;
} {
  const theoretical = calculateReviewDates(point.studyDate);
  const stage = Math.min(point.currentStage, REVIEW_INTERVALS.length - 1);
  const stored = point.reviewDates;

  // Detect corruption #1: old absolute-offset algorithm
  const oldR2 = point.studyDate + 2 * DAY_MS;
  const actualR2 = stored.length === 10 ? stored[1] : 0;
  const broken1 = Math.abs(actualR2 - oldR2) < DAY_MS && Math.abs(actualR2 - theoretical[1]) >= DAY_MS;

  // Detect corruption #2: double-interval (stored date for current stage
  // is significantly further in the future than nextReviewDate suggests)
  let broken2 = false;
  if (!broken1 && stored.length === 10 && stage < 10) {
    const storedStageDate = stored[stage];
    // If the stored date for the current stage is more than 2x the expected
    // interval from now compared to nextReviewDate, it's double-interval corruption
    const expectedGap = point.nextReviewDate - Date.now();
    const storedGap = storedStageDate - Date.now();
    if (expectedGap > 0 && storedGap > expectedGap * 1.5) {
      broken2 = true;
    }
  }

  if (broken1) {
    return {
      reviewDates: theoretical,
      nextReviewDate: theoretical[stage],
      wasBroken: true,
    };
  }

  if (broken2 && stage < 10) {
    // Rebuild: past stages as-is, current stage = nextReviewDate,
    // future stages projected correctly from nextReviewDate.
    const rebuilt = [...stored];
    rebuilt[stage] = point.nextReviewDate;
    let cursor = point.nextReviewDate;
    for (let i = stage + 1; i < REVIEW_INTERVALS.length; i++) {
      cursor = cursor + REVIEW_INTERVALS[i] * DAY_MS;
      rebuilt[i] = cursor;
    }
    return {
      reviewDates: rebuilt,
      nextReviewDate: point.nextReviewDate,
      wasBroken: true,
    };
  }

  // Data is valid — leave it alone.
  return {
    reviewDates: point.reviewDates,
    nextReviewDate: point.nextReviewDate,
    wasBroken: false,
  };
}

/** Build cumulative review dates from a start date. Used only for initial creation. */
export function calculateReviewDates(fromDate: number): number[] {
  const dates: number[] = [];
  let cursor = fromDate;
  for (const days of REVIEW_INTERVALS) {
    cursor = cursor + days * DAY_MS;
    dates.push(cursor);
  }
  return dates;
}

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
 * Computes nextReviewDate dynamically: now + interval[nextStage].
 * Also updates reviewDates so past stages reflect actual completion dates
 * and future stages are projected from the actual schedule.
 */
export function advanceStage(point: KnowledgePoint, allowSkip: boolean = false): StageResult {
  const newConsecutive = point.consecutiveCorrect + 1;
  let nextStage = point.currentStage + 1;

  if (allowSkip && newConsecutive >= 3 && nextStage < REVIEW_INTERVALS.length) {
    nextStage = Math.min(nextStage + 1, REVIEW_INTERVALS.length);
  }

  // Skip unchecked stages if enabledStages is set
  if (point.enabledStages && point.enabledStages.length === 10) {
    while (nextStage < 10 && !point.enabledStages[nextStage]) {
      nextStage++;
    }
  }

  // Rebuild reviewDates: set the just-completed stage to today, project future
  // dates from nextReviewDate. This keeps the calendar in sync with actual
  // review timing — if a review was postponed, future dates shift accordingly.
  const now = Date.now();
  const reviewDates = buildSyncedReviewDates(point, point.currentStage, now);

  if (nextStage >= REVIEW_INTERVALS.length) {
    return {
      currentStage: REVIEW_INTERVALS.length,
      nextReviewDate: reviewDates[REVIEW_INTERVALS.length - 1],
      reviewDates,
      consecutiveCorrect: newConsecutive,
      errorCount: 0,
      errorAtStage: 0,
      status: 'completed',
      action: 'completed',
      message: '全部复习完成！',
    };
  }

  const nextReviewDate = now + REVIEW_INTERVALS[nextStage] * DAY_MS;
  // Project future reviewDates from the new nextReviewDate
  const finalReviewDates = projectFutureDates(reviewDates, nextStage, nextReviewDate);

  return {
    currentStage: nextStage,
    nextReviewDate,
    reviewDates: finalReviewDates,
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
 * Error review → insert makeup at current stage.
 * Degrade or reset only on repeated errors.
 */
export function handleError(point: KnowledgePoint): StageResult {
  const stage = point.currentStage;
  const newErrorCount = (point.errorAtStage === stage ? point.errorCount : 0) + 1;
  const now = Date.now();
  const reviewDates = buildSyncedReviewDates(point, point.currentStage, now);

  // Same stage error 3+ times → reset to R1
  if (newErrorCount >= 3) {
    const nextReviewDate = now + REVIEW_INTERVALS[0] * DAY_MS;
    return {
      currentStage: 0,
      nextReviewDate,
      reviewDates: projectFutureDates(reviewDates, 0, nextReviewDate),
      consecutiveCorrect: 0,
      errorCount: 0,
      errorAtStage: 0,
      status: 'active',
      action: 'reset',
      message: '同一节点连续 3 次出错，已重置回 R1',
    };
  }

  // Same stage error 2 times → downgrade one stage
  if (newErrorCount >= 2) {
    const downgradedStage = Math.max(0, stage - 1);
    const nextReviewDate = now + REVIEW_INTERVALS[downgradedStage] * DAY_MS;
    return {
      currentStage: downgradedStage,
      nextReviewDate,
      reviewDates: projectFutureDates(reviewDates, downgradedStage, nextReviewDate),
      consecutiveCorrect: 0,
      errorCount: 0,
      errorAtStage: 0,
      status: 'active',
      action: 'downgraded',
      message: `同一节点连续 2 次出错，已降级到 R${downgradedStage + 1}`,
    };
  }

  // First error at this stage → insert makeup review tomorrow
  const nextReviewDate = now + DAY_MS;
  return {
    currentStage: stage,
    nextReviewDate,
    reviewDates: projectFutureDates(reviewDates, stage, nextReviewDate),
    consecutiveCorrect: 0,
    errorCount: newErrorCount,
    errorAtStage: stage,
    status: 'active',
    action: 'makeup',
    message: `在 R${stage + 1} 插入补练复习，明天再巩固一次`,
  };
}

// ── Helpers: keep reviewDates in sync with actual review timing ──

/**
 * Build a reviewDates array where stages before `completedStage` reflect
 * actual dates from the stored reviewDates (if available), the
 * `completedStage` is set to `completionDate`, and later stages are
 * projected forward from `completionDate`.
 */
function buildSyncedReviewDates(
  point: KnowledgePoint,
  completedStage: number,
  completionDate: number,
): number[] {
  const existing = point.reviewDates.length === 10
    ? [...point.reviewDates]
    : calculateReviewDates(point.studyDate);

  // Mark the just-completed stage with the actual completion date
  if (completedStage >= 0 && completedStage < 10) {
    existing[completedStage] = completionDate;
  }

  return existing;
}

/**
 * Project future reviewDates from `fromStage` onward based on `baseDate`
 * and the remaining REVIEW_INTERVALS.
 * `baseDate` is the already-computed date for `fromStage` itself, so we
 * set it directly and project intervals for stages after it.
 */
function projectFutureDates(
  dates: number[],
  fromStage: number,
  baseDate: number,
): number[] {
  const result = [...dates];
  result[fromStage] = baseDate;
  let cursor = baseDate;
  for (let i = fromStage + 1; i < REVIEW_INTERVALS.length; i++) {
    cursor = cursor + REVIEW_INTERVALS[i] * DAY_MS;
    result[i] = cursor;
  }
  return result;
}
