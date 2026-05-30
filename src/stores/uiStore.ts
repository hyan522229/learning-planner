import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  focusMode: boolean;
  activeModal: string | null;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setFocusMode: (v: boolean) => void;
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  openModal: (name: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      focusMode: false,
      activeModal: null,
      theme: 'system',
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setFocusMode: (v) => set({ focusMode: v }),
      setTheme: (t) => {
        set({ theme: t });
        const root = document.documentElement;
        if (t === 'dark') root.classList.add('dark');
        else if (t === 'light') root.classList.remove('dark');
        else root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
      },
      openModal: (name) => set({ activeModal: name }),
      closeModal: () => set({ activeModal: null }),
    }),
    { name: 'learning-planner-ui' }
  )
);
