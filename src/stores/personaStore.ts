import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import type { Persona, AppSettings } from '@/types';
import { DEFAULT_DAILY_CAP_MINUTES, DEFAULT_BLOCK_DURATION, DEFAULT_BREAK_DURATION, DEFAULT_SUBJECT_CAP_MINUTES, DEFAULT_SUBJECT_GAP_MINUTES, DEFAULT_MANDATORY_THRESHOLD, DEFAULT_SKIP_DAYS_PER_MONTH } from '@/engine/constants';

interface PersonaState {
  activePersonaId: string | null;
  personas: Persona[];
  setActivePersona: (id: string) => void;
  loadPersonas: () => Promise<void>;
  createPersona: (name: string, avatarEmoji: string, color: string, avatarImage?: string) => Promise<string>;
  deletePersona: (id: string) => Promise<void>;
}

export const usePersonaStore = create<PersonaState>((set, get) => ({
  activePersonaId: null,
  personas: [],

  setActivePersona: (id) => set({ activePersonaId: id }),

  loadPersonas: async () => {
    const personas = await db.personas.toArray();
    const activeId = get().activePersonaId;
    if (personas.length > 0 && (!activeId || !personas.find(p => p.id === activeId))) {
      set({ personas, activePersonaId: personas[0].id });
    } else {
      set({ personas });
    }
  },

  createPersona: async (name, avatarEmoji, color, avatarImage?) => {
    const id = generateId();
    const now = Date.now();
    const persona: Persona = { id, name, avatarEmoji, avatarImage, color, createdAt: now };
    await db.personas.add(persona);

    const settings: AppSettings = {
      id, personaId: id, dailyTotalCapMinutes: DEFAULT_DAILY_CAP_MINUTES,
      defaultBlockDuration: DEFAULT_BLOCK_DURATION, breakDurationMinutes: DEFAULT_BREAK_DURATION,
      sameSubjectMinGapMinutes: DEFAULT_SUBJECT_GAP_MINUTES,
      mandatoryThresholdPercent: DEFAULT_MANDATORY_THRESHOLD,
      skipDaysPerMonth: DEFAULT_SKIP_DAYS_PER_MONTH, skipDaysUsedThisMonth: 0,
      lastSkipResetMonth: now, recoveryDayEnabled: true, autoPromptNewProject: true,
      soundEnabled: true, taskCompleteMusicEnabled: true, restAlarmEnabled: true, theme: 'system',
      newKnowledgePerDayLimit: 3, autoSkipEnabled: false,
    };
    await db.settings.add(settings);

    set(s => ({ personas: [...s.personas, persona], activePersonaId: id }));
    return id;
  },

  deletePersona: async (id) => {
    await db.personas.delete(id);
    await db.subjects.where({ personaId: id }).delete();
    await db.knowledgePoints.where({ personaId: id }).delete();
    await db.projects.where({ personaId: id }).delete();
    await db.blocks.where({ personaId: id }).delete();
    await db.errorProblems.where({ personaId: id }).delete();
    await db.environments.where({ personaId: id }).delete();
    await db.dailyPlans.where({ personaId: id }).delete();
    await db.dailyStatuses.where({ personaId: id }).delete();
    await db.settings.delete(id);

    const personas = await db.personas.toArray();
    set({ personas, activePersonaId: personas[0]?.id ?? null });
  },
}));
