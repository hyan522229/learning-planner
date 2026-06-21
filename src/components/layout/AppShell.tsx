import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';
import { useTimerStore } from '@/stores/timerStore';
import { FocusOverlay } from '@/components/timer/FocusOverlay';
import { TimerWidget } from '@/components/timer/TimerWidget';
import { useUIStore } from '@/stores/uiStore';
import { useEffect, useCallback } from 'react';
import { seedDatabase } from '@/db';
import { usePersonaStore } from '@/stores/personaStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';

export function AppShell() {
  const focusMode = useUIStore(s => s.focusMode);
  const timerPhase = useTimerStore(s => s.phase);
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const loadPersonas = usePersonaStore(s => s.loadPersonas);
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const loadEnvironments = useEnvironmentStore(s => s.loadEnvironments);
  const setTheme = useUIStore(s => s.setTheme);
  const theme = useUIStore(s => s.theme);
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed);
  const toggleSidebar = useUIStore(s => s.toggleSidebar);
  const repairAllKnowledgePoints = useKnowledgeStore(s => s.repairAllKnowledgePoints);
  const location = useLocation();

  useEffect(() => {
    seedDatabase().then(() => {
      loadPersonas();
    });
  }, [loadPersonas]);

  useEffect(() => {
    if (activePersonaId) {
      loadSettings(activePersonaId);
      loadEnvironments(activePersonaId);
      repairAllKnowledgePoints(activePersonaId).then(count => {
        if (count > 0) console.log(`[Ebbinghaus] Repaired ${count} knowledge point(s)`);
      });
    }
  }, [activePersonaId, loadSettings, loadEnvironments, repairAllKnowledgePoints]);

  useEffect(() => {
    setTheme(theme);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (window.innerWidth < 1024) {
      useUIStore.setState({ sidebarCollapsed: true });
    }
  }, [location.pathname]);

  const handleBackdropClick = useCallback(() => {
    useUIStore.setState({ sidebarCollapsed: true });
  }, []);

  if (focusMode && timerPhase === 'running') {
    return (
      <>
        <TimerWidget />
        <FocusOverlay />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <TimerWidget />
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              onClick={handleBackdropClick}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="p-4 lg:p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        <TabBar />
      </div>
    </div>
  );
}
