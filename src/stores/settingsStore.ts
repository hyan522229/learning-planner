import { create } from 'zustand';
import { db } from '@/db';
import type { AppSettings } from '@/types';

interface SettingsState {
  settings: AppSettings | null;
  loadSettings: (personaId: string) => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,

  loadSettings: async (personaId) => {
    let s = await db.settings.get(personaId);
    if (!s) {
      s = await db.settings.get({ personaId });
    }
    set({ settings: s ?? null });
  },

  updateSettings: async (partial) => {
    const current = get().settings;
    if (!current) return;
    const updated = { ...current, ...partial };
    await db.settings.put(updated);
    set({ settings: updated });
  },
}));
