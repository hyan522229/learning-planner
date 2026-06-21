import { create } from 'zustand';
import { db } from '@/db';
import { generateFullPlan, type FullPlanOutput } from '@/engine/daily-planner';
import type { DailyPlan, Block, Environment, AppSettings } from '@/types';
import { startOfDayEpoch } from '@/utils/date';

interface DailyPlanState {
  todayPlan: DailyPlan | null;
  todayBlocks: Block[];
  fullPlanOutput: FullPlanOutput | null;
  warnings: string[];
  generating: boolean;
  generateTodayPlan: (personaId: string, environment: Environment, settings: AppSettings) => Promise<FullPlanOutput>;
  loadTodayPlan: (personaId: string) => Promise<void>;
  loadWeekPlans: (personaId: string, weekStart: number) => Promise<Map<number, { plan: DailyPlan; blocks: Block[] }>>;
  loadRangePlans: (personaId: string, rangeStart: number, rangeEnd: number) => Promise<Map<number, { plan: DailyPlan; blocks: Block[] }>>;
  loadMonthPlans: (personaId: string, monthStart: number, monthEnd: number) => Promise<Map<number, DailyPlan>>;
}

export const useDailyPlanStore = create<DailyPlanState>((set) => ({
  todayPlan: null,
  todayBlocks: [],
  fullPlanOutput: null,
  warnings: [],
  generating: false,

  generateTodayPlan: async (personaId, environment, settings) => {
    set({ generating: true });
    try {
      const result = await generateFullPlan({
        personaId,
        date: startOfDayEpoch(),
        environment,
        settings,
      });

      // Extract today's plan for the main view
      const today = startOfDayEpoch();
      const todayData = result.dailyPlans.get(today);

      set({
        fullPlanOutput: result,
        todayPlan: todayData?.plan || null,
        todayBlocks: todayData?.blocks || [],
        warnings: result.warnings,
        generating: false,
      });
      return result;
    } catch (e) {
      set({ generating: false });
      throw e;
    }
  },

  loadTodayPlan: async (personaId) => {
    const today = startOfDayEpoch();
    const plan = await db.dailyPlans
      .where({ personaId, date: today })
      .first();

    if (plan) {
      const blocks = await db.blocks.bulkGet(plan.blockIds);
      const validBlocks = blocks.filter(Boolean) as Block[];
      set({
        todayPlan: plan,
        todayBlocks: validBlocks.sort((a, b) => a.sortOrder - b.sortOrder),
      });
    } else {
      set({ todayPlan: null, todayBlocks: [] });
    }
  },

  loadWeekPlans: async (personaId, weekStart) => {
    const weekEnd = weekStart + 7 * 86400000;
    const plans = await db.dailyPlans
      .where({ personaId })
      .filter(p => p.date >= weekStart && p.date < weekEnd)
      .toArray();

    const result = new Map<number, { plan: DailyPlan; blocks: Block[] }>();
    for (const plan of plans) {
      const blocks = await db.blocks.bulkGet(plan.blockIds);
      const validBlocks = (blocks.filter(Boolean) as Block[]).sort((a, b) => a.sortOrder - b.sortOrder);
      result.set(plan.date, { plan, blocks: validBlocks });
    }
    return result;
  },

  loadRangePlans: async (personaId, rangeStart, rangeEnd) => {
    const plans = await db.dailyPlans
      .where({ personaId })
      .filter(p => p.date >= rangeStart && p.date < rangeEnd)
      .toArray();

    const result = new Map<number, { plan: DailyPlan; blocks: Block[] }>();
    for (const plan of plans) {
      const blocks = await db.blocks.bulkGet(plan.blockIds);
      const validBlocks = (blocks.filter(Boolean) as Block[]).sort((a, b) => a.sortOrder - b.sortOrder);
      result.set(plan.date, { plan, blocks: validBlocks });
    }
    return result;
  },

  loadMonthPlans: async (personaId, monthStart, monthEnd) => {
    const plans = await db.dailyPlans
      .where({ personaId })
      .filter(p => p.date >= monthStart && p.date <= monthEnd)
      .toArray();

    const result = new Map<number, DailyPlan>();
    for (const plan of plans) {
      result.set(plan.date, plan);
    }
    return result;
  },
}));
