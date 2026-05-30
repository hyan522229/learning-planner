import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { usePersonaStore } from '@/stores/personaStore';

export function useAllKnowledge() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);

  return useLiveQuery(
    async () => {
      if (!activePersonaId) return [];
      return db.knowledgePoints
        .where({ personaId: activePersonaId })
        .reverse()
        .sortBy('createdAt');
    },
    [activePersonaId]
  ) ?? [];
}
