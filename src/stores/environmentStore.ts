import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import type { Environment, TimeSlotTemplate } from '@/types';

interface EnvironmentState {
  environments: Environment[];
  activeEnvironmentId: string | null;
  loadEnvironments: (personaId: string) => Promise<void>;
  setActiveEnvironment: (id: string) => void;
  addEnvironment: (data: Omit<Environment, 'id'>) => Promise<string>;
  updateEnvironment: (id: string, data: Partial<Environment>) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  copyEnvironment: (id: string, newName: string, targetPersonaId?: string) => Promise<string>;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  activeEnvironmentId: null,

  loadEnvironments: async (personaId) => {
    const envs = await db.environments.where({ personaId }).toArray();
    const activeId = get().activeEnvironmentId;
    const defaultEnv = envs.find(e => e.isDefault);
    if (!activeId || !envs.find(e => e.id === activeId)) {
      set({ environments: envs, activeEnvironmentId: defaultEnv?.id ?? envs[0]?.id ?? null });
    } else {
      set({ environments: envs });
    }
  },

  setActiveEnvironment: (id) => set({ activeEnvironmentId: id }),

  addEnvironment: async (data) => {
    const id = generateId();
    const env: Environment = { ...data, id };
    await db.environments.add(env);
    set(s => ({ environments: [...s.environments, env] }));
    return id;
  },

  updateEnvironment: async (id, data) => {
    await db.environments.update(id, data);
    set(s => ({
      environments: s.environments.map(e => e.id === id ? { ...e, ...data } : e),
    }));
  },

  deleteEnvironment: async (id) => {
    await db.environments.delete(id);
    set(s => ({ environments: s.environments.filter(e => e.id !== id) }));
  },

  copyEnvironment: async (id, newName, targetPersonaId) => {
    const source = get().environments.find(e => e.id === id);
    if (!source) throw new Error('环境未找到');

    const newId = generateId();
    const newEnv: Environment = {
      ...source,
      id: newId,
      personaId: targetPersonaId ?? source.personaId,
      name: newName,
      isDefault: false,
      timeSlots: source.timeSlots.map(s => ({ ...s, id: generateId() })),
    };
    await db.environments.add(newEnv);
    set(s => ({ environments: [...s.environments, newEnv] }));
    return newId;
  },
}));
