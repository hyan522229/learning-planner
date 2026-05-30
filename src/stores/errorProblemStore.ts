import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import { addDaysToEpoch, startOfDayEpoch } from '@/utils/date';
import type { ErrorProblem } from '@/types';

interface ErrorProblemState {
  addErrorProblem: (data: { personaId: string; subjectId?: string; name: string }) => Promise<string>;
  submitRedo: (id: string, correct: boolean) => Promise<{ status: string; nextDate: number }>;
  getDueErrors: (personaId: string) => Promise<ErrorProblem[]>;
  getAllErrors: (personaId: string) => Promise<ErrorProblem[]>;
  deleteErrorProblem: (id: string) => Promise<void>;
}

export const useErrorProblemStore = create<ErrorProblemState>(() => ({
  addErrorProblem: async (data) => {
    const id = generateId();
    const now = Date.now();
    const tomorrow = startOfDayEpoch(new Date()) + 86400000;

    const problem: ErrorProblem = {
      ...data,
      id,
      addedDate: now,
      nextReviewDate: tomorrow,
      reviewCount: 0,
      status: 'pending',
      createdAt: now,
    };
    await db.errorProblems.add(problem);
    return id;
  },

  submitRedo: async (id, correct) => {
    const problem = await db.errorProblems.get(id);
    if (!problem) throw new Error('错题未找到');

    let status: ErrorProblem['status'];
    let nextDate: number;

    if (correct) {
      if (problem.status === 'checking') {
        // Was in checking phase, now cleared
        status = 'cleared';
        nextDate = 0;
      } else {
        // Enter checking phase (3 day wait)
        status = 'checking';
        nextDate = addDaysToEpoch(Date.now(), 3);
      }
    } else {
      // Wrong - requeue tomorrow
      status = 'pending';
      nextDate = addDaysToEpoch(Date.now(), 1);
    }

    await db.errorProblems.update(id, {
      status,
      nextReviewDate: nextDate,
      reviewCount: problem.reviewCount + 1,
      checkDate: status === 'checking' ? Date.now() : undefined,
    });

    return { status, nextDate };
  },

  getDueErrors: async (personaId) => {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const endMs = todayEnd.getTime();

    return db.errorProblems
      .where({ personaId })
      .filter(e => e.status !== 'cleared' && e.nextReviewDate <= endMs)
      .toArray();
  },

  getAllErrors: async (personaId) => {
    return db.errorProblems
      .where({ personaId })
      .reverse()
      .sortBy('createdAt');
  },

  deleteErrorProblem: async (id) => {
    await db.errorProblems.delete(id);
  },
}));
