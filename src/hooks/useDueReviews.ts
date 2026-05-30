import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { usePersonaStore } from '@/stores/personaStore';

export function useDueReviews() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);

  return useLiveQuery(
    async () => {
      if (!activePersonaId) return [];
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const endMs = todayEnd.getTime();

      return db.knowledgePoints
        .where({ personaId: activePersonaId, status: 'active' })
        .filter(kp => kp.nextReviewDate <= endMs)
        .toArray();
    },
    [activePersonaId]
  ) ?? [];
}
