import { db } from '@/db';
import { generateId } from '@/utils/id';
import { startOfDayEpoch } from '@/utils/date';
import { isTimeInPast } from '@/utils/time';
import { REVIEW_BLOCK_MINUTES, ERROR_BLOCK_MINUTES, REVIEW_INTERVALS } from './constants';
import { DAY_MS } from './ebbinghaus';
import { useCollectionStore } from '@/stores/collectionStore';
import type { Block, DailyPlan, Environment, AppSettings, Project } from '@/types';

export interface PlanInput {
  personaId: string;
  date: number;
  environment: Environment;
  settings: AppSettings;
}

export interface PlanOutput {
  blocks: Block[];
  dailyPlan: DailyPlan;
  warnings: string[];
}

export interface FullPlanOutput {
  dailyPlans: Map<number, { plan: DailyPlan; blocks: Block[] }>;
  warnings: string[];
  totalDaysGenerated: number;
}

export async function generateDailyPlan(input: PlanInput): Promise<PlanOutput> {
  const { personaId, date, environment, settings } = input;
  const warnings: string[] = [];

  // Remove existing scheduled blocks for this date
  const existingBlocks = await db.blocks
    .where({ personaId, date, status: 'scheduled' })
    .toArray();
  for (const b of existingBlocks) {
    await db.blocks.delete(b.id);
  }
  const existingPlan = await db.dailyPlans
    .where({ personaId, date })
    .first();
  if (existingPlan) {
    await db.dailyPlans.delete(existingPlan.id);
  }

  const result = await buildDayBlocks(personaId, date, environment, settings);
  const { blocks, mandatoryMinutes } = result;
  warnings.push(...result.warnings);

  // Sort blocks by time
  blocks.sort((a, b) => a.timeSlotStart.localeCompare(b.timeSlotStart));
  blocks.forEach((b, i) => b.sortOrder = i);

  // Persist
  await db.blocks.bulkAdd(blocks);

  const planId = generateId();
  const dailyPlan: DailyPlan = {
    id: planId, personaId, environmentId: environment.id, date,
    blockIds: blocks.map(b => b.id),
    availableMinutes: result.availableMinutes,
    mandatoryMinutes,
    newLearningMinutes: blocks.filter(b => b.type === 'new_learning' || b.type === 'exercise').reduce((s, b) => s + b.estimatedDurationMinutes, 0),
    status: 'active',
    generatedAt: Date.now(),
  };

  await db.dailyPlans.add(dailyPlan);

  return { blocks, dailyPlan, warnings };
}

export async function generateFullPlan(input: PlanInput): Promise<FullPlanOutput> {
  const { personaId, date, environment, settings } = input;
  const warnings: string[] = [];
  const dailyPlans = new Map<number, { plan: DailyPlan; blocks: Block[] }>();

  // Delete ALL existing scheduled blocks and daily plans for this persona
  await db.blocks.where({ personaId, status: 'scheduled' }).delete();
  await db.dailyPlans.where({ personaId }).delete();

  // Snapshot knowledge points & error problems before simulation so we can
  // restore original state when done (simulation mutates stage/nextReviewDate).
  const allKPs = await db.knowledgePoints.where({ personaId, status: 'active' }).toArray();
  const savedKPStates = new Map(allKPs.map(kp => [kp.id, { currentStage: kp.currentStage, nextReviewDate: kp.nextReviewDate }]));

  const allErrors = await db.errorProblems.where({ personaId }).filter(e => e.status !== 'cleared').toArray();
  const savedErrorStates = new Map(allErrors.map(e => [e.id, { nextReviewDate: e.nextReviewDate }]));

  // Get all active projects sorted by priority
  const projects = await db.projects
    .where({ personaId, status: 'active' })
    .toArray();
  projects.sort((a, b) => a.priority - b.priority);

  // Track remaining amounts per project (clone to avoid mutation)
  const projectRemaining = new Map<string, number>();
  for (const p of projects) {
    projectRemaining.set(p.id, p.total - p.completed);
  }

  const MAX_DAYS = 90;
  let currentDate = date;
  let daysGenerated = 0;
  let allProjectsDone = false;

  while (daysGenerated < MAX_DAYS && !allProjectsDone) {
    const dayStart = startOfDayEpoch(new Date(currentDate));

    // Build blocks for this day with project allocation
    const result = await buildDayBlocks(
      personaId,
      dayStart,
      environment,
      settings,
      projects,
      projectRemaining,
      true, // isFullPlan — advance nextReviewDate to simulate review completion
    );

    if (result.blocks.length > 0) {
      // Sort and persist
      result.blocks.sort((a, b) => a.timeSlotStart.localeCompare(b.timeSlotStart));
      result.blocks.forEach((b, i) => b.sortOrder = i);

      await db.blocks.bulkAdd(result.blocks);

      const planId = generateId();
      const dailyPlan: DailyPlan = {
        id: planId,
        personaId,
        environmentId: environment.id,
        date: dayStart,
        blockIds: result.blocks.map(b => b.id),
        availableMinutes: result.availableMinutes,
        mandatoryMinutes: result.mandatoryMinutes,
        newLearningMinutes: result.blocks
          .filter(b => b.type === 'new_learning' || b.type === 'exercise')
          .reduce((s, b) => s + b.estimatedDurationMinutes, 0),
        status: 'active',
        generatedAt: Date.now(),
      };

      await db.dailyPlans.add(dailyPlan);
      dailyPlans.set(dayStart, { plan: dailyPlan, blocks: result.blocks });
    }

    warnings.push(...result.warnings);

    // Check if all projects are done
    allProjectsDone = Array.from(projectRemaining.values()).every(v => v <= 0);

    // Move to next day
    currentDate = dayStart + 86400000;
    daysGenerated++;
  }

  // Restore knowledge point & error problem state so simulation doesn't
  // permanently advance stages.
  for (const [id, state] of savedKPStates) {
    await db.knowledgePoints.update(id, { currentStage: state.currentStage, nextReviewDate: state.nextReviewDate, updatedAt: Date.now() });
  }
  for (const [id, state] of savedErrorStates) {
    await db.errorProblems.update(id, { nextReviewDate: state.nextReviewDate });
  }

  // Merge in completed blocks that survived deletion so weekly/monthly views
  // still show what was actually done.
  const completedBlocks = await db.blocks
    .where({ personaId, status: 'completed' })
    .toArray();
  for (const block of completedBlocks) {
    const dayData = dailyPlans.get(block.date);
    if (dayData) {
      // Avoid duplicating block IDs if somehow already present
      if (!dayData.plan.blockIds.includes(block.id)) {
        dayData.plan.blockIds.push(block.id);
        dayData.blocks.push(block);
        await db.dailyPlans.update(dayData.plan.id, { blockIds: dayData.plan.blockIds });
      }
    } else if (block.date >= date && block.date < date + MAX_DAYS * 86400000) {
      // Completed block on a day that has no generated plan — create a stub
      const planId = generateId();
      const stubPlan: DailyPlan = {
        id: planId, personaId, environmentId: environment.id, date: block.date,
        blockIds: [block.id],
        availableMinutes: 0, mandatoryMinutes: 0, newLearningMinutes: 0,
        status: 'active', generatedAt: Date.now(),
      };
      await db.dailyPlans.add(stubPlan);
      dailyPlans.set(block.date, { plan: stubPlan, blocks: [block] });
    }
  }

  return { dailyPlans, warnings, totalDaysGenerated: daysGenerated };
}

interface DayBuildResult {
  blocks: Block[];
  availableMinutes: number;
  mandatoryMinutes: number;
  warnings: string[];
}

async function buildDayBlocks(
  personaId: string,
  date: number,
  environment: Environment,
  settings: AppSettings,
  projects?: Project[],
  projectRemaining?: Map<string, number>,
  isFullPlan?: boolean,
): Promise<DayBuildResult> {
  const warnings: string[] = [];
  const blocks: Block[] = [];
  let sortOrder = 0;

  // Step 1: Collect mandatory tasks for this date
  const dayEnd = date + 86399999; // end of day in ms

  const allDueReviews = await db.knowledgePoints
    .where({ personaId, status: 'active' })
    .filter(kp => kp.nextReviewDate <= dayEnd)
    .toArray();
  const dueReviews = allDueReviews;

  const allDueErrors = await db.errorProblems
    .where({ personaId })
    .filter(e => e.status !== 'cleared' && e.nextReviewDate <= dayEnd)
    .toArray();
  const dueErrors = allDueErrors;

  const mandatoryMinutes = dueReviews.reduce((sum, r) => sum + (r.reviewDurationMinutes || REVIEW_BLOCK_MINUTES), 0)
    + dueErrors.length * ERROR_BLOCK_MINUTES;

  // Calculate available time from environment slots
  const isToday = startOfDayEpoch() === startOfDayEpoch(new Date(date));
  const envSlots = isToday
    ? environment.timeSlots.filter(s => !isTimeInPast(s.endTime))
    : environment.timeSlots;
  const availableMinutes = envSlots.reduce((sum, s) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return sum + (eh * 60 + em) - (sh * 60 + sm);
  }, 0);

  // ── Simple queue-based fill: reviews first, then errors, then new learning ──

  // Helper: Fisher-Yates shuffle
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Prepare review queue (random order)
  const reviewQueue = shuffle(dueReviews);
  let reviewCursor = 0;

  // Prepare error queue (random order)
  const errorQueue = shuffle(dueErrors);
  let errorCursor = 0;

  // Prepare projects — filter by collection rules
  let allProjects = projects || await db.projects
    .where({ personaId })
    .filter(p => p.status === 'active' || p.status === 'completed')
    .toArray();

  // Apply collection rules: only include projects that collections deem active
  if (!projects) {
    const collectionActiveIds = await useCollectionStore.getState().getActiveProjectIds(personaId);
    if (collectionActiveIds.size > 0) {
      // Check if any project is in a collection — if so, filter to only collection-active projects
      const allCollections = await db.projectCollections.where({ personaId }).toArray();
      const allManagedIds = new Set(allCollections.flatMap(c => c.projectIds));
      if (allManagedIds.size > 0) {
        // Projects managed by collections: only include if active
        // Projects NOT in any collection: always include
        allProjects = allProjects.filter(p =>
          !allManagedIds.has(p.id) || collectionActiveIds.has(p.id)
        );
      }
    }
  }

  const shuffledProjects = shuffle(allProjects);

  const remaining = projectRemaining || new Map<string, number>();
  if (!projectRemaining) {
    for (const p of allProjects) {
      remaining.set(p.id, p.total - p.completed);
    }
  }

  // Count completed blocks toward the daily limit (remaining work is
  // already correct from total - completed, no need to deduct again)
  const todayCompleted = await db.blocks
    .where({ personaId, date, status: 'completed' })
    .toArray();
  const projectBlockCounts = new Map<string, number>();
  for (const block of todayCompleted) {
    if (block.projectId && block.type !== 'review' && block.type !== 'error_problem') {
      projectBlockCounts.set(block.projectId, (projectBlockCounts.get(block.projectId) || 0) + 1);
    }
  }

  let projectCursor = 0;

  // Iterate through slots in chronological order
  const sortedSlots = [...envSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (const slot of sortedSlots) {
    const slotMinutes = getSlotMinutes(slot);
    const slotStartMin = timeToMinutes(slot.startTime);
    let cursorMin = slotStartMin; // current time cursor within the slot

    // ── Priority 1: Reviews (highest priority) ──
    while (reviewCursor < reviewQueue.length && cursorMin < slotStartMin + slotMinutes) {
      const r = reviewQueue[reviewCursor];
      const dur = r.reviewDurationMinutes || REVIEW_BLOCK_MINUTES;
      // Allow 2 min overflow at slot end to keep block complete
      if (cursorMin + dur > slotStartMin + slotMinutes + 2) break;
      reviewCursor++;

      blocks.push({
        id: generateId(), personaId, type: 'review',
        subjectId: r.subjectId,
        name: `R${r.currentStage + 1} ${r.name}`,
        estimatedDurationMinutes: dur,
        knowledgePointIds: [r.id],
        date,
        timeSlotStart: minutesToTime(cursorMin),
        timeSlotEnd: minutesToTime(cursorMin + dur),
        status: 'scheduled', sortOrder: sortOrder++,
      });
      cursorMin += dur;

      if (isFullPlan) {
        const nextStage = Math.min(r.currentStage + 1, REVIEW_INTERVALS.length - 1);
        const nextDate = date + REVIEW_INTERVALS[nextStage] * DAY_MS;
        await db.knowledgePoints.update(r.id, { currentStage: nextStage, nextReviewDate: nextDate, updatedAt: Date.now() });
      }
    }

    // ── Priority 2: Error problems ──
    while (errorCursor < errorQueue.length && cursorMin < slotStartMin + slotMinutes) {
      if (cursorMin + ERROR_BLOCK_MINUTES > slotStartMin + slotMinutes + 2) break;
      const e = errorQueue[errorCursor];
      errorCursor++;

      blocks.push({
        id: generateId(), personaId, type: 'error_problem',
        subjectId: e.subjectId,
        name: `重做 ${e.name}`,
        estimatedDurationMinutes: ERROR_BLOCK_MINUTES,
        errorProblemIds: [e.id],
        date,
        timeSlotStart: minutesToTime(cursorMin),
        timeSlotEnd: minutesToTime(cursorMin + ERROR_BLOCK_MINUTES),
        status: 'scheduled', sortOrder: sortOrder++,
      });
      cursorMin += ERROR_BLOCK_MINUTES;

      if (isFullPlan) {
        await db.errorProblems.update(e.id, { nextReviewDate: date + DAY_MS });
      }
    }

    // ── Priority 3: New learning / exercise ──
    // dailyBlockLimit: 0 = skip, -1 = unlimited, N = exactly N blocks today (incl. completed)
    {
      const slotEndMin = slotStartMin + slotMinutes;
      let loops = 0;
      const maxLoops = shuffledProjects.length * 3;

      while (cursorMin < slotEndMin && loops < maxLoops) {
        loops++;
        const proj = shuffledProjects[projectCursor % shuffledProjects.length];
        projectCursor++;

        if (proj.dailyBlockLimit === 0) continue;

        const projRemaining = remaining.get(proj.id) || 0;
        if (projRemaining <= 0) continue;

        // Enforce daily limit
        if (proj.dailyBlockLimit > 0) {
          const currentCount = projectBlockCounts.get(proj.id) || 0;
          if (currentCount >= proj.dailyBlockLimit) continue;
        }

        // Use FULL block duration — never truncated
        const blockMins = settings.defaultBlockDuration;
        if (blockMins <= 0) continue;

        // If block can't fit in this slot, skip — next slot picks it up
        if (cursorMin + blockMins > slotEndMin) continue;

        const blockType: Block['type'] = proj.category === 'exercise' ? 'exercise' : 'new_learning';
        blocks.push({
          id: generateId(), personaId, type: blockType,
          subjectId: proj.subjectId, projectId: proj.id,
          name: proj.name,
          estimatedDurationMinutes: blockMins,
          date,
          timeSlotStart: minutesToTime(cursorMin),
          timeSlotEnd: minutesToTime(cursorMin + blockMins),
          status: 'scheduled', sortOrder: sortOrder++,
        });

        cursorMin += blockMins;

        if (proj.measureType === 'minutes') {
          remaining.set(proj.id, projRemaining - blockMins);
        } else if (proj.currentSpeedEWMA > 0) {
          remaining.set(proj.id, Math.max(0, projRemaining - (blockMins / 60) * proj.currentSpeedEWMA));
        } else {
          remaining.set(proj.id, Math.max(0, projRemaining - 1));
        }

        projectBlockCounts.set(proj.id, (projectBlockCounts.get(proj.id) || 0) + 1);
      }
    }
  }

  return { blocks, availableMinutes, mandatoryMinutes, warnings };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function getSlotMinutes(slot: { startTime: string; endTime: string }): number {
  return timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
}

