import { create } from 'zustand';
import { db } from '@/db';
import type { Block, BlockStatus } from '@/types';
import { useDailyPlanStore } from './dailyPlanStore';

interface BlockState {
  updateBlockStatus: (blockId: string, status: BlockStatus, actualDurationMinutes?: number) => Promise<void>;
  skipBlock: (blockId: string) => Promise<void>;
}

export const useBlockStore = create<BlockState>(() => ({
  updateBlockStatus: async (blockId, status, actualDurationMinutes) => {
    const update: Partial<Block> = { status };
    if (actualDurationMinutes !== undefined) {
      update.actualDurationMinutes = actualDurationMinutes;
    }
    if (status === 'completed') {
      update.completedAt = Date.now();
    }
    await db.blocks.update(blockId, update);

    // Refresh the plan store
    const plan = useDailyPlanStore.getState().todayPlan;
    if (plan) {
      const blocks = await db.blocks.bulkGet(plan.blockIds);
      const validBlocks = blocks.filter(Boolean) as Block[];
      useDailyPlanStore.setState({ todayBlocks: validBlocks.sort((a, b) => a.sortOrder - b.sortOrder) });
    }
  },

  skipBlock: async (blockId) => {
    await db.blocks.update(blockId, { status: 'skipped' });
    const plan = useDailyPlanStore.getState().todayPlan;
    if (plan) {
      const blocks = await db.blocks.bulkGet(plan.blockIds);
      const validBlocks = blocks.filter(Boolean) as Block[];
      useDailyPlanStore.setState({ todayBlocks: validBlocks.sort((a, b) => a.sortOrder - b.sortOrder) });
    }
  },
}));
