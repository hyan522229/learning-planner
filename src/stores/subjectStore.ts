import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import type { Subject } from '@/types';

interface SubjectState {
  subjects: Subject[];
  loadSubjects: (personaId: string) => Promise<void>;
  addSubject: (data: Omit<Subject, 'id'>) => Promise<string>;
  removeSubject: (id: string) => Promise<void>;
}

export const useSubjectStore = create<SubjectState>((set) => ({
  subjects: [],

  loadSubjects: async (personaId) => {
    const subjects = await db.subjects.where({ personaId }).sortBy('priority');
    set({ subjects });
  },

  addSubject: async (data) => {
    const id = generateId();
    const subject: Subject = { ...data, id };
    await db.subjects.add(subject);
    set(s => ({ subjects: [...s.subjects, subject].sort((a, b) => a.priority - b.priority) }));
    return id;
  },

  removeSubject: async (id) => {
    await db.subjects.delete(id);
    set(s => ({ subjects: s.subjects.filter(sub => sub.id !== id) }));
  },
}));
