import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useTimerStore } from '@/stores/timerStore';
import { FocusOverlay } from '@/components/timer/FocusOverlay';
import { useUIStore } from '@/stores/uiStore';
import { useEffect } from 'react';
import { seedDatabase } from '@/db';
import { usePersonaStore } from '@/stores/personaStore';
import { useSettingsStore } from '@/stores/settingsStore';

export function AppShell() {
  const focusMode = useUIStore(s => s.focusMode);
  const timerPhase = useTimerStore(s => s.phase);
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const loadPersonas = usePersonaStore(s => s.loadPersonas);
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const setTheme = useUIStore(s => s.setTheme);
  const theme = useUIStore(s => s.theme);
  const location = useLocation();

  useEffect(() => {
    seedDatabase().then(() => {
      loadPersonas();
    });
  }, []);

  useEffect(() => {
    if (activePersonaId) {
      loadSettings(activePersonaId);
    }
  }, [activePersonaId, loadSettings]);

  useEffect(() => {
    setTheme(theme);
  }, []);

  if (focusMode && timerPhase === 'running') {
    return <FocusOverlay />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
