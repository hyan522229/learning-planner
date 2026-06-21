import type { KnowledgePoint } from '@/types';
import { REVIEW_INTERVALS } from './constants';

export const DAY_MS = 86400000;

/**
 * Repair a knowledge point's reviewDates if they were created by the old
 * (absolute-offset) algorithm. Does NOT force past-due reviews to today —
 * the daily planner already queries `nextReviewDate <= dayEnd` which
 * naturally catches overdue items.
 */
export function repairKnowledgePoint(point: KnowledgePoint): {
  reviewDates: number[];
  nextReviewDate: number;
  wasBroken: boolean;
} {
  const correctReviewDates = calculateReviewDates(point.studyDate);

  // Detect if dates were from the old (broken) absolute-offset algorithm.
  const oldR2 = point.studyDate + 2 * DAY_MS;
  const actualR2 = point.reviewDates[1];
  const wasBroken = Math.abs(actualR2 - oldR2) < DAY_MS && Math.abs(actualR2 - correctReviewDates[1]) >= DAY_MS;

  if (wasBroken) {
    // Fix the reviewDates array and recompute nextReviewDate from the
    // correct cumulative dates at the current stage.
    const stage = Math.min(point.currentStage, REVIEW_INTERVALS.length - 1);
    return {
      reviewDates: correctReviewDates,
      nextReviewDate: correctReviewDates[stage],
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
 * This keeps intervals correct regardless of whether the point was
 * created before or after the cumulative-interval fix.
 */
export function advanceStage(point: KnowledgePoint, allowSkip: boolean = false): StageResult {
  const newConsecutive = point.consecutiveCorrect + 1;
  let nextStage = point.currentStage + 1;

  if (allowSkip && newConsecutive >= 3 && nextStage < REVIEW_INTERVALS.length) {
    nextStage = Math.min(nextStage + 1, REVIEW_INTERVALS.length);
  }

  // Keep reviewDates rooted at studyDate for calendar display
  const reviewDates = point.reviewDates.length === 10 ? point.reviewDates : calculateReviewDates(point.studyDate);

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
 * Error review → insert makeup at current stage.
 * Degrade or reset only on repeated errors.
 */
export function handleError(point: KnowledgePoint): StageResult {
  const stage = point.currentStage;
  const newErrorCount = (point.errorAtStage === stage ? point.errorCount : 0) + 1;
  const reviewDates = point.reviewDates.length === 10 ? point.reviewDates : calculateReviewDates(point.studyDate);

  // Same stage error 3+ times → reset to R1
  if (newErrorCount >= 3) {
    return {
      currentStage: 0,
      nextReviewDate: Date.now() + REVIEW_INTERVALS[0] * DAY_MS,
      reviewDates,
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
    return {
      currentStage: downgradedStage,
      nextReviewDate: Date.now() + REVIEW_INTERVALS[downgradedStage] * DAY_MS,
      reviewDates,
      consecutiveCorrect: 0,
      errorCount: 0,
      errorAtStage: 0,
      status: 'active',
      action: 'downgraded',
      message: `同一节点连续 2 次出错，已降级到 R${downgradedStage + 1}`,
    };
  }

  // First error at this stage → insert makeup review tomorrow
  return {
    currentStage: stage,
    nextReviewDate: Date.now() + DAY_MS,
    reviewDates,
    consecutiveCorrect: 0,
    errorCount: newErrorCount,
    errorAtStage: stage,
    status: 'active',
    action: 'makeup',
    message: `在 R${stage + 1} 插入补练复习，明天再巩固一次`,
  };
}
