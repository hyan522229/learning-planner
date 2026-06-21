/**
 * Ebbinghaus engine test — pure logic verification (no IndexedDB).
 * Run: node scripts/test-ebbinghaus.mjs
 */

const DAY_MS = 86400000;
const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60, 120, 240, 365];

// ─── Engine (copied from src/engine/ebbinghaus.ts) ───

function calculateReviewDates(fromDate) {
  const dates = [];
  let cursor = fromDate;
  for (const days of REVIEW_INTERVALS) {
    cursor = cursor + days * DAY_MS;
    dates.push(cursor);
  }
  return dates;
}

function advanceStage(point, allowSkip = false) {
  const newConsecutive = point.consecutiveCorrect + 1;
  let nextStage = point.currentStage + 1;

  if (allowSkip && newConsecutive >= 3 && nextStage < REVIEW_INTERVALS.length) {
    nextStage = Math.min(nextStage + 1, REVIEW_INTERVALS.length);
  }

  if (nextStage >= REVIEW_INTERVALS.length) {
    const newDates = calculateReviewDates(Date.now());
    return {
      currentStage: REVIEW_INTERVALS.length,
      nextReviewDate: newDates[REVIEW_INTERVALS.length - 1],
      reviewDates: newDates,
      consecutiveCorrect: newConsecutive,
      errorCount: 0,
      errorAtStage: 0,
      status: 'completed',
      action: 'completed',
      message: '全部复习完成！',
    };
  }

  const newDates = calculateReviewDates(Date.now());
  return {
    currentStage: nextStage,
    nextReviewDate: Date.now() + REVIEW_INTERVALS[nextStage] * DAY_MS,
    reviewDates: newDates,
    consecutiveCorrect: newConsecutive,
    errorCount: 0,
    errorAtStage: 0,
    status: 'active',
    action: 'advanced',
    message: `推进到 R${nextStage + 1}`,
  };
}

function handleError(point) {
  const stage = point.currentStage;
  const newErrorCount = (point.errorAtStage === stage ? point.errorCount : 0) + 1;

  if (newErrorCount >= 3) {
    const newDates = calculateReviewDates(Date.now());
    return {
      currentStage: 0,
      nextReviewDate: newDates[0],
      reviewDates: newDates,
      consecutiveCorrect: 0,
      errorCount: 0,
      errorAtStage: 0,
      status: 'active',
      action: 'reset',
      message: '同一节点连续 3 次出错，已重置回 R1',
    };
  }

  if (newErrorCount >= 2) {
    const downgradedStage = Math.max(0, stage - 1);
    const newDates = calculateReviewDates(Date.now());
    return {
      currentStage: downgradedStage,
      nextReviewDate: newDates[0],
      reviewDates: newDates,
      consecutiveCorrect: 0,
      errorCount: 0,
      errorAtStage: 0,
      status: 'active',
      action: 'downgraded',
      message: `降级到 R${downgradedStage + 1}`,
    };
  }

  const newDates = calculateReviewDates(Date.now());
  return {
    currentStage: stage,
    nextReviewDate: newDates[0],
    reviewDates: newDates,
    consecutiveCorrect: 0,
    errorCount: newErrorCount,
    errorAtStage: stage,
    status: 'active',
    action: 'makeup',
    message: `在 R${stage + 1} 插入补练复习`,
  };
}

function repairKnowledgePoint(point) {
  const correctReviewDates = calculateReviewDates(point.studyDate);

  const oldR2 = point.studyDate + 2 * DAY_MS;
  const actualR2 = point.reviewDates[1];
  const wasBroken = Math.abs(actualR2 - oldR2) < DAY_MS && Math.abs(actualR2 - correctReviewDates[1]) >= DAY_MS;

  if (wasBroken) {
    const stage = Math.min(point.currentStage, REVIEW_INTERVALS.length - 1);
    return { reviewDates: correctReviewDates, nextReviewDate: correctReviewDates[stage], wasBroken: true };
  }

  return { reviewDates: point.reviewDates, nextReviewDate: point.nextReviewDate, wasBroken: false };
}

// ─── Test helpers ───

const pass = 0;
const fail = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error(`  FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    // console.log(`  ✓ ${msg}`);
  }
}

function makePoint(overrides = {}) {
  const studyDate = overrides.studyDate || Date.now() - DAY_MS; // yesterday by default
  const reviewDates = calculateReviewDates(studyDate);
  return {
    id: 'test-1',
    personaId: 'p1',
    subjectId: 's1',
    name: 'Test Point',
    studyDate,
    currentStage: 0,
    nextReviewDate: reviewDates[0],
    reviewDates,
    consecutiveCorrect: 0,
    masteryRating: 0,
    errorCount: 0,
    errorAtStage: -1,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function isDueToday(point) {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return point.nextReviewDate <= todayEnd.getTime();
}

function formatDate(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

// ─── Tests ───

console.log('\n=== Test 1: calculateReviewDates (cumulative intervals) ===');
const studyDate = Date.now() - DAY_MS; // yesterday
const dates = calculateReviewDates(studyDate);
console.log(`  Study date: ${formatDate(studyDate)}`);
console.log(`  R1: ${formatDate(dates[0])} (should be today)`);
console.log(`  R2: ${formatDate(dates[1])} (should be R1 + 2 days)`);
console.log(`  R3: ${formatDate(dates[2])} (should be R2 + 4 days)`);
console.log(`  R4: ${formatDate(dates[3])} (should be R3 + 7 days)`);

assert(dates[0] === studyDate + 1 * DAY_MS, 'R1 = studyDate + 1 day');
assert(dates[1] === studyDate + 3 * DAY_MS, 'R2 = studyDate + 3 days (cumulative)');
assert(dates[2] === studyDate + 7 * DAY_MS, 'R3 = studyDate + 7 days');
assert(dates[3] === studyDate + 14 * DAY_MS, 'R4 = studyDate + 14 days');
assert(dates[4] === studyDate + 29 * DAY_MS, 'R5 = studyDate + 29 days');

console.log('\n=== Test 2: New knowledge point is due today (studyDate = yesterday) ===');
const p1 = makePoint({ studyDate: Date.now() - DAY_MS });
console.log(`  nextReviewDate: ${formatDate(p1.nextReviewDate)} (should be today)`);
console.log(`  isDueToday: ${isDueToday(p1)}`);
assert(isDueToday(p1), 'Point with studyDate=yesterday should be due today');

console.log('\n=== Test 3: New knowledge point is NOT due today (studyDate = today) ===');
const pToday = makePoint({ studyDate: Date.now() });
console.log(`  nextReviewDate: ${formatDate(pToday.nextReviewDate)} (should be tomorrow)`);
assert(!isDueToday(pToday), 'Point with studyDate=today should NOT be due today');

console.log('\n=== Test 4: advanceStage from R1 to R2 ===');
const afterR1 = advanceStage({ ...p1, currentStage: 0, consecutiveCorrect: 0 });
console.log(`  Current stage: ${afterR1.currentStage} (should be 1)`);
console.log(`  Next review: ${formatDate(afterR1.nextReviewDate)} (should be 2 days from now)`);
const expectedR2 = Date.now() + 2 * DAY_MS;
assert(Math.abs(afterR1.nextReviewDate - expectedR2) < 1000, 'R2 = now + 2 days');
assert(afterR1.status === 'active', 'Still active after R1');

console.log('\n=== Test 5: Complete all 10 stages ===');
let point = { ...p1 };
for (let i = 0; i < 10; i++) {
  const result = advanceStage(point);
  point = { ...point, ...result };
  console.log(`  Stage ${i} → ${result.currentStage}: ${result.message}`);
}
assert(point.currentStage === 10, 'After 10 reviews, stage should be 10');
// Note: completed points won't have status propagated through spread since advanceStage returns status

console.log('\n=== Test 6: handleError - first error (makeup) ===');
const err1 = handleError({ ...p1, currentStage: 2, errorCount: 0, errorAtStage: -1 });
console.log(`  Action: ${err1.action}, nextReview: ${formatDate(err1.nextReviewDate)}`);
assert(err1.action === 'makeup', 'First error should be makeup');
assert(err1.nextReviewDate > Date.now(), 'Makeup review should be in the future');

console.log('\n=== Test 7: handleError - second error (downgrade) ===');
const err2 = handleError({ ...p1, currentStage: 2, errorCount: 1, errorAtStage: 2 });
console.log(`  Action: ${err2.action}`);
assert(err2.action === 'downgraded', 'Second error should downgrade');

console.log('\n=== Test 8: handleError - third error (reset) ===');
const err3 = handleError({ ...p1, currentStage: 2, errorCount: 2, errorAtStage: 2 });
console.log(`  Action: ${err3.action}`);
assert(err3.action === 'reset', 'Third error should reset');

console.log('\n=== Test 9: repairKnowledgePoint - detect old broken data ===');
// Simulate a point created with old absolute-offset algorithm
const oldDates = [];
let oldCursor = p1.studyDate;
for (const days of REVIEW_INTERVALS) {
  oldCursor = p1.studyDate + days * DAY_MS; // OLD: absolute, not cumulative
  oldDates.push(oldCursor);
}
const brokenPoint = {
  ...p1,
  reviewDates: oldDates,
  currentStage: 0,
  nextReviewDate: oldDates[0],
};
console.log(`  Old R1: ${formatDate(brokenPoint.reviewDates[0])}`);
console.log(`  Old R2: ${formatDate(brokenPoint.reviewDates[1])} (should be wrong)`);
const repair = repairKnowledgePoint(brokenPoint);
console.log(`  Was broken: ${repair.wasBroken}`);
console.log(`  Fixed R2: ${formatDate(repair.reviewDates[1])}`);
assert(repair.wasBroken, 'Should detect old broken dates');

console.log('\n=== Test 10: repairKnowledgePoint - valid data is NOT rescheduled ===');
const ancientPoint = {
  ...p1,
  studyDate: Date.now() - 30 * DAY_MS,
  reviewDates: calculateReviewDates(Date.now() - 30 * DAY_MS),
  currentStage: 0,
  nextReviewDate: Date.now() - 20 * DAY_MS, // way in the past
};
const repairAncient = repairKnowledgePoint(ancientPoint);
console.log(`  Old nextReviewDate: ${formatDate(ancientPoint.nextReviewDate)}`);
console.log(`  Repair nextReviewDate: ${formatDate(repairAncient.nextReviewDate)} (should remain unchanged — not broken)`);
assert(repairAncient.nextReviewDate === ancientPoint.nextReviewDate, 'Valid past-due data should remain unchanged');
assert(!repairAncient.wasBroken, 'Valid data should not be flagged broken');

console.log('\n=== Test 11: Full multi-day simulation ===');
const simStudyDate = Date.now() - DAY_MS;
let simPoint = {
  ...makePoint({ studyDate: simStudyDate }),
  id: 'sim-1',
};
console.log(`  Study date: ${formatDate(simStudyDate)}`);
console.log(`  Initial nextReviewDate: ${formatDate(simPoint.nextReviewDate)} (isDue: ${isDueToday(simPoint)})`);

// Simulate reviewing correctly through 5 stages
for (let i = 0; i < 5; i++) {
  const result = advanceStage(simPoint);
  simPoint = { ...simPoint, ...result };
  const dueDays = Math.round((simPoint.nextReviewDate - Date.now()) / DAY_MS);
  console.log(`  After R${i + 1}: stage=${simPoint.currentStage}, next in ${dueDays} days (${formatDate(simPoint.nextReviewDate)})`);
  assert(simPoint.currentStage === i + 1, `Stage should advance to ${i + 1}`);
}

console.log('\n' + (process.exitCode ? 'SOME TESTS FAILED' : 'All tests passed! ✓'));
