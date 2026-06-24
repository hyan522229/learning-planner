import { usePersonaStore } from '@/stores/personaStore';
import { useUIStore } from '@/stores/uiStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Moon, Sun, Monitor, ChevronDown, Plus, Check, Menu } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

export function TopBar() {
  const personas = usePersonaStore(s => s.personas);
  const activeId = usePersonaStore(s => s.activePersonaId);
  const setActive = usePersonaStore(s => s.setActivePersona);
  const theme = useUIStore(s => s.theme);
  const setTheme = useUIStore(s => s.setTheme);
  const toggleSidebar = useUIStore(s => s.toggleSidebar);
  const activePersona = personas.find(p => p.id === activeId);

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
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          aria-label="菜单"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm text-muted-foreground">{today}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Persona dropdown — Radix */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full border transition-colors duration-200',
                'hover:border-primary/40',
                'active:scale-[0.98]',
                'border-border bg-card',
                'data-[state=open]:border-primary/50 data-[state=open]:bg-primary/5',
              )}
            >
              {activePersona?.avatarImage ? (
                <img src={activePersona.avatarImage} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
              ) : (
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full text-base shrink-0"
                  style={{ backgroundColor: activePersona?.color || '#6366f1' }}
                >
                  {activePersona?.avatarEmoji || '➕'}
                </span>
              )}
              <span className="text-sm font-medium max-w-[80px] truncate">
                {activePersona?.name || '选择人物'}
              </span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>切换人物</DropdownMenuLabel>
            {personas.map(p => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => setActive(p.id)}
                className={cn(p.id === activeId && 'bg-accent')}
              >
                {p.avatarImage ? (
                  <img src={p.avatarImage} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />
                ) : (
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-full text-sm shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.avatarEmoji}
                  </span>
                )}
                <span className="flex-1">{p.name}</span>
                {p.id === activeId && <Check size={14} className="text-primary shrink-0" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => useUIStore.getState().openModal('add-persona')}
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 shrink-0">
                <Plus size={14} />
              </span>
              <span>添加人物</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title={themeLabel}
        >
          <ThemeIcon size={18} />
        </button>
      </div>
    </header>
  );
}
