import { db } from '@/db';
import type { Project, ProjectCollection } from '@/types';

export interface CollectionProgress {
  totalProgress: number;
  completionProgress: number;
  completedCount: number;
  totalCount: number;
  totalUnits: number;
  completedUnits: number;
}

/**
 * Calculate progress for a collection by aggregating its member projects.
 *
 * `totalProgress` is the percentage of projects that have reached "completed" status.
 * `completionProgress` is the percentage of total work units completed across all projects
 * (sum of completed / sum of total).
 *
 * If `projects` is provided it is used directly; otherwise the projects are fetched from
 * the database via `collection.projectIds`. Archived projects are excluded from the
 * calculation.
 */
export async function calcCollectionProgress(
  collection: ProjectCollection,
  projects?: Project[],
): Promise<CollectionProgress> {
  const resolved: Project[] =
    projects ??
    (await db.projects.bulkGet(collection.projectIds)).filter(
      (p): p is Project => p !== undefined,
    );

  const active = resolved.filter((p) => p.status !== 'archived');

  const totalCount = active.length;
  const completedCount = active.filter((p) => p.status === 'completed').length;
  const totalUnits = active.reduce((sum, p) => sum + p.total, 0);
  const completedUnits = active.reduce((sum, p) => sum + p.completed, 0);

  const totalProgress =
    totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
  const completionProgress =
    totalUnits > 0 ? Math.min(100, Math.round((completedUnits / totalUnits) * 100)) : 0;

  return {
    totalProgress,
    completionProgress,
    completedCount,
    totalCount,
    totalUnits,
    completedUnits,
  };
}
