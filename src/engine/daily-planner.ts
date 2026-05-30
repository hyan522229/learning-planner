import { db } from '@/db';
import { generateId } from '@/utils/id';
import { startOfDayEpoch } from '@/utils/date';
import { isTimeInPast } from '@/utils/time';
import { REVIEW_BLOCK_MINUTES, ERROR_BLOCK_MINUTES } from './constants';
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
): Promise<DayBuildResult> {
  const warnings: string[] = [];
  const blocks: Block[] = [];
  let sortOrder = 0;

  // Step 1: Collect mandatory tasks for this date
  const dayEnd = date + 86399999; // end of day in ms

  const dueReviews = await db.knowledgePoints
    .where({ personaId, status: 'active' })
    .filter(kp => kp.nextReviewDate <= dayEnd)
    .toArray();

  const dueErrors = await db.errorProblems
    .where({ personaId })
    .filter(e => e.status !== 'cleared' && e.nextReviewDate <= dayEnd)
    .toArray();

  const mandatoryMinutes = dueReviews.length * REVIEW_BLOCK_MINUTES + dueErrors.length * ERROR_BLOCK_MINUTES;

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

  // Step 2: Check threshold
  const thresholdMinutes = (settings.mandatoryThresholdPercent / 100) * availableMinutes;
  const allowNewLearning = mandatoryMinutes <= thresholdMinutes;

  if (!allowNewLearning) {
    warnings.push(`${new Date(date).toLocaleDateString('zh-CN')} 必须完成的任务超过${settings.mandatoryThresholdPercent}%阈值，不安排新学习`);
  }

  // Step 3: Create mandatory blocks (reviews + errors)
  const reviewSlots = envSlots.filter(s => s.allowedBlockTypes.includes('review'));
  let reviewSlotIdx = 0;

  const reviewsBySubject = new Map<string, typeof dueReviews>();
  for (const r of dueReviews) {
    const list = reviewsBySubject.get(r.subjectId) || [];
    list.push(r);
    reviewsBySubject.set(r.subjectId, list);
  }

  for (const [subjectId, reviews] of reviewsBySubject) {
    if (reviewSlotIdx < reviewSlots.length) {
      const slot = reviewSlots[reviewSlotIdx];
      blocks.push({
        id: generateId(), personaId, type: 'review', subjectId,
        name: `复习 ${reviews.length} 个知识点`,
        estimatedDurationMinutes: Math.min(REVIEW_BLOCK_MINUTES * reviews.length, slot.defaultDuration),
        knowledgePointIds: reviews.map(r => r.id),
        date, timeSlotStart: slot.startTime, timeSlotEnd: slot.endTime,
        status: 'scheduled', sortOrder: sortOrder++,
      });
      reviewSlotIdx++;
    }
  }

  if (dueErrors.length > 0 && reviewSlotIdx < reviewSlots.length) {
    const slot = reviewSlots[reviewSlotIdx];
    blocks.push({
      id: generateId(), personaId, type: 'error_problem',
      subjectId: dueErrors[0].subjectId,
      name: `重做 ${dueErrors.length} 道错题`,
      estimatedDurationMinutes: Math.min(ERROR_BLOCK_MINUTES * dueErrors.length, slot.defaultDuration),
      errorProblemIds: dueErrors.map(e => e.id),
      date, timeSlotStart: slot.startTime, timeSlotEnd: slot.endTime,
      status: 'scheduled', sortOrder: sortOrder++,
    });
  }

  // Step 4: Allocate new learning + exercise by project priority
  if (allowNewLearning) {
    const remainingBudget = availableMinutes - mandatoryMinutes;

    const activeProjects = projects || await db.projects
      .where({ personaId, status: 'active' })
      .toArray();
    activeProjects.sort((a, b) => a.priority - b.priority);

    const remaining = projectRemaining || new Map<string, number>();
    if (!projectRemaining) {
      for (const p of activeProjects) {
        remaining.set(p.id, p.total - p.completed);
      }
    }

    const slotUsed = new Map<string, number>();
    let budgetLeft = remainingBudget;

    for (const project of activeProjects) {
      if (budgetLeft <= 0) break;

      const projRemaining = remaining.get(project.id) || 0;
      if (projRemaining <= 0) continue;

      const estMinutes = Math.min(
        estimateProjectSession(project, settings.defaultBlockDuration, projRemaining),
        budgetLeft,
      );

      const blockType: Block['type'] = project.category === 'exercise' ? 'exercise' : 'new_learning';
      const matchingSlots = envSlots.filter(s => s.allowedBlockTypes.includes(blockType));

      for (const slot of matchingSlots) {
        const usedInSlot = slotUsed.get(slot.id) || 0;
        const slotCapacity = getSlotMinutes(slot) - usedInSlot;

        if (slotCapacity >= estMinutes) {
          if (project.subjectId && slot.allowedSubjectIds.length > 0 &&
              !slot.allowedSubjectIds.includes(project.subjectId)) {
            continue;
          }

          blocks.push({
            id: generateId(), personaId, type: blockType,
            subjectId: project.subjectId, projectId: project.id,
            name: project.name,
            estimatedDurationMinutes: estMinutes,
            date, timeSlotStart: slot.startTime, timeSlotEnd: slot.endTime,
            status: 'scheduled', sortOrder: sortOrder++,
          });

          slotUsed.set(slot.id, usedInSlot + estMinutes);
          budgetLeft -= estMinutes;

          // Update remaining for this project
          if (project.measureType === 'minutes') {
            remaining.set(project.id, projRemaining - estMinutes);
          } else if (project.currentSpeedEWMA > 0) {
            const amountCompleted = (estMinutes / 60) * project.currentSpeedEWMA;
            remaining.set(project.id, Math.max(0, projRemaining - amountCompleted));
          } else {
            // Without speed data, treat the session as 1 unit
            remaining.set(project.id, Math.max(0, projRemaining - 1));
          }

          break;
        }
      }
    }
  }

  return { blocks, availableMinutes, mandatoryMinutes, warnings };
}

function getSlotMinutes(slot: { startTime: string; endTime: string }): number {
  const [sh, sm] = slot.startTime.split(':').map(Number);
  const [eh, em] = slot.endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function estimateProjectSession(project: Project, defaultDuration: number, remainingOverride?: number): number {
  const remaining = remainingOverride ?? (project.total - project.completed);
  if (project.measureType === 'minutes') {
    return Math.min(remaining, defaultDuration);
  }
  if (project.currentSpeedEWMA > 0) {
    const hoursNeeded = remaining / project.currentSpeedEWMA;
    const minutesNeeded = Math.ceil(hoursNeeded * 60);
    return Math.min(minutesNeeded, defaultDuration);
  }
  return defaultDuration;
}
