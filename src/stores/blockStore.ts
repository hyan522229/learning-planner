import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import { startOfDayEpoch } from '@/utils/date';
import type { Block, BlockStatus, BlockType } from '@/types';
import { useDailyPlanStore } from './dailyPlanStore';
import { useKnowledgeStore } from './knowledgeStore';

interface BlockState {
  updateBlockStatus: (blockId: string, status: BlockStatus, actualDurationMinutes?: number) => Promise<void>;
  skipBlock: (blockId: string) => Promise<void>;
  addBlock: (data: {
    personaId: string; projectId: string; subjectId?: string;
    name: string; type: BlockType; estimatedDurationMinutes: number;
    date?: number;
  }) => Promise<void>;
}

export const useBlockStore = create<BlockState>(() => ({
  addBlock: async (data) => {
    const date = data.date || startOfDayEpoch();
    const newBlock: Block = {
      id: generateId(),
      personaId: data.personaId,
      type: data.type,
      subjectId: data.subjectId,
      projectId: data.projectId,
      name: data.name,
      estimatedDurationMinutes: data.estimatedDurationMinutes,
      date,
      timeSlotStart: '--:--',
      timeSlotEnd: '--:--',
      status: 'scheduled',
      sortOrder: 999,
    };
    await db.blocks.add(newBlock);

    // Wire into today's plan if matching
    const plan = useDailyPlanStore.getState().todayPlan;
    if (plan && plan.date === date) {
      const updatedIds = [...plan.blockIds, newBlock.id];
      await db.dailyPlans.update(plan.id, { blockIds: updatedIds });
      const blocks = await db.blocks.bulkGet(updatedIds);
      const validBlocks = blocks.filter(Boolean) as Block[];
      useDailyPlanStore.setState({
        todayPlan: { ...plan, blockIds: updatedIds },
        todayBlocks: validBlocks.sort((a, b) => a.sortOrder - b.sortOrder),
      });
      // Also update fullPlanOutput if loaded
      const fpo = useDailyPlanStore.getState().fullPlanOutput;
      if (fpo) {
        const dayData = fpo.dailyPlans.get(date);
        if (dayData) {
          dayData.blocks.push(newBlock);
          dayData.plan.blockIds.push(newBlock.id);
        }
      }
    }
  },

  updateBlockStatus: async (blockId, status, actualDurationMinutes) => {
    const block = await db.blocks.get(blockId);
    if (!block) return;

    const update: Partial<Block> = { status };
    if (actualDurationMinutes !== undefined) {
      update.actualDurationMinutes = actualDurationMinutes;
    }
    if (status === 'completed') {
      update.completedAt = Date.now();

      // Advance associated knowledge points (review blocks)
      if (block.type === 'review' && block.knowledgePointIds?.length) {
        const kpStore = useKnowledgeStore.getState();
        for (const kpId of block.knowledgePointIds) {
          try { await kpStore.submitReview(kpId, 4); } catch { /* ignore */ }
        }
      }
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
