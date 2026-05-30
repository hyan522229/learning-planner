import { useState, useRef, useEffect } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { useUIStore } from '@/stores/uiStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Moon, Sun, Monitor, ChevronDown, Plus, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'motion/react';

export function TopBar() {
  const personas = usePersonaStore(s => s.personas);
  const activeId = usePersonaStore(s => s.activePersonaId);
  const setActive = usePersonaStore(s => s.setActivePersona);
  const theme = useUIStore(s => s.theme);
  const setTheme = useUIStore(s => s.setTheme);
  const activePersona = personas.find(p => p.id === activeId);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const today = format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhCN });

  const cycleTheme = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const themeLabel = theme === 'dark' ? '暗色模式' : theme === 'light' ? '亮色模式' : '跟随系统';

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-card shrink-0">
      <div>
        <span className="text-sm text-muted-foreground">{today}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Persona dropdown */}
        <div className="relative">
          <button
            ref={triggerRef}
            onClick={() => setMenuOpen(o => !o)}
            className={cn(
              'flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-xl border transition-all duration-200',
              'hover:border-brand-300 hover:shadow-sm',
              'active:scale-[0.98]',
              menuOpen
                ? 'border-brand-400 bg-brand-50/50 shadow-sm ring-2 ring-brand-500/15'
                : 'border-border bg-card'
            )}
          >
            <span
              className="flex items-center justify-center w-7 h-7 rounded-full text-base shrink-0"
              style={{ backgroundColor: activePersona?.color || '#6366f1' }}
            >
              {activePersona?.avatarEmoji || '👤'}
            </span>
            <span className="text-sm font-medium max-w-[80px] truncate">
              {activePersona?.name || '选择人物'}
            </span>
            <ChevronDown
              size={14}
              className={cn(
                'text-muted-foreground transition-transform duration-200',
                menuOpen && 'rotate-180'
              )}
            />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border bg-card shadow-xl z-50 overflow-hidden"
              >
                <div className="p-1.5">
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                    切换人物
                  </div>
                  {personas.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActive(p.id);
                        setMenuOpen(false);
                      }}
                      className={cn(
                        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors',
                        p.id === activeId
                          ? 'bg-brand-50 text-brand-700 font-medium'
                          : 'hover:bg-muted'
                      )}
                    >
                      <span
                        className="flex items-center justify-center w-8 h-8 rounded-full text-lg shrink-0"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.avatarEmoji}
                      </span>
                      <span className="flex-1 text-sm truncate">{p.name}</span>
                      {p.id === activeId && (
                        <Check size={16} className="text-brand-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t mx-1.5" />
                <button
                  onClick={() => {
                    useUIStore.getState().openModal('add-persona');
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 shrink-0">
                    <Plus size={16} />
                  </span>
                  <span>添加人物</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title={themeLabel}
        >
          <ThemeIcon size={18} />
        </button>
      </div>
    </header>
  );
}
