import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import { startOfDayEpoch } from '@/utils/date';
import type { ProjectCollection } from '@/types';

const DAY_MS = 86400000;

export function getCycleActiveProjectId(
  collection: { cycleDays: number; cycleStartDate: number; projectIds: string[] },
  todayEpoch: number,
  projectRemaining?: string[],
  projectStatuses?: Record<string, string>
): string | null {
  const nc = projectRemaining ?? [];
  const cycleLen = Math.min(collection.cycleDays || nc.length, nc.length);
  if (cycleLen <= 0 || nc.length === 0) return null;
  const daysSinceStart = Math.floor((todayEpoch - collection.cycleStartDate) / DAY_MS);
  const index = ((daysSinceStart % cycleLen) + cycleLen) % cycleLen;
  return nc[index] || null;
}

interface CollectionState {
  addCollection: (data: {
    personaId: string; name: string; projectIds: string[]; mode: 'single' | 'dual' | 'cycle';
  }) => Promise<string>;
  updateCollection: (id: string, partial: Partial<ProjectCollection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  getActiveProjectIds: (personaId: string, todayEpoch?: number) => Promise<Set<string>>;
  restartCycle: (collectionId: string) => Promise<void>;
  updateCollectionBlockLimit: (collectionId: string, limit: number) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>(() => ({
  addCollection: async (data) => {
    const id = generateId();
    const col: ProjectCollection = {
      id, personaId: data.personaId, name: data.name,
      projectIds: data.projectIds, mode: data.mode,
      cycleDays: 7,
      cycleStartDate: Date.now(),
      dailyBlockLimit: -1,
      createdAt: Date.now(),
    };
    await db.projectCollections.add(col);
    return id;
  },

  updateCollection: async (id, partial) => {
    await db.projectCollections.update(id, partial);
  },

  deleteCollection: async (id) => {
    await db.projectCollections.delete(id);
  },

  /**
   * Return the set of project IDs that should appear in today's plan
   * according to collection rules (single / dual / cycle mode).
   */
  getActiveProjectIds: async (personaId, todayEpoch) => {
    const epoch = todayEpoch ?? startOfDayEpoch();
    const collections = await db.projectCollections.where({ personaId }).toArray();
    const activeIds = new Set<string>();

    // Collect all project IDs across collections and bulk-fetch once
    const allProjectIds = collections.flatMap(c => c.projectIds);
    const projects = await db.projects.bulkGet(allProjectIds);
    const projectMap = new Map(projects.filter(p => p).map(p => [p!.id, p!]));

    for (const col of collections) {
      // Get non-completed projects in collection order
      const remaining = col.projectIds
        .map(id => projectMap.get(id))
        .filter(p => p && p.status !== 'completed')
        .map(p => p!.id);

      if (col.mode === 'cycle') {
        const activeId = getCycleActiveProjectId(col, epoch, remaining);
        if (activeId) activeIds.add(activeId);
      } else if (col.mode === 'single') {
        if (remaining.length > 0) activeIds.add(remaining[0]);
      } else {
        // dual mode: take first two non-completed
        for (let i = 0; i < Math.min(2, remaining.length); i++) {
          activeIds.add(remaining[i]);
        }
      }
    }

    return activeIds;
  },

  restartCycle: async (collectionId) => {
    await db.projectCollections.update(collectionId, {
      cycleStartDate: startOfDayEpoch(),
    });
  },

  updateCollectionBlockLimit: async (collectionId, limit) => {
    await db.projectCollections.update(collectionId, {
      dailyBlockLimit: limit,
    });
  },
}));
