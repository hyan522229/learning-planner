import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import type { ProjectCollection } from '@/types';

interface CollectionState {
  addCollection: (data: {
    personaId: string; name: string; projectIds: string[]; mode: 'single' | 'dual';
  }) => Promise<string>;
  updateCollection: (id: string, partial: Partial<ProjectCollection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  getActiveProjectIds: (personaId: string) => Promise<Set<string>>;
}

export const useCollectionStore = create<CollectionState>(() => ({
  addCollection: async (data) => {
    const id = generateId();
    const col: ProjectCollection = {
      id, personaId: data.personaId, name: data.name,
      projectIds: data.projectIds, mode: data.mode,
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
   * according to collection rules (single/dual sequential mode).
   */
  getActiveProjectIds: async (personaId) => {
    const collections = await db.projectCollections.where({ personaId }).toArray();
    const activeIds = new Set<string>();

    for (const col of collections) {
      // Find non-completed projects in order
      const projects = await db.projects.bulkGet(col.projectIds);
      const active = projects.filter(p => p && p.status !== 'completed');

      if (col.mode === 'single') {
        if (active.length > 0) activeIds.add(active[0]!.id);
      } else {
        // dual mode: take first two
        for (let i = 0; i < Math.min(2, active.length); i++) {
          if (active[i]) activeIds.add(active[i]!.id);
        }
      }
    }

    return activeIds;
  },
}));
