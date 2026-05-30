import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { usePersonaStore } from '@/stores/personaStore';
import { useRef, useCallback } from 'react';
import gsap from 'gsap';
import {
  LayoutDashboard, BookOpen, CalendarCheck, Timer, FolderKanban,
  AlertTriangle, Globe, BarChart3, Settings, ChevronLeft, ChevronRight, CalendarDays
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/knowledge', icon: BookOpen, label: '知识点' },
  { to: '/plan', icon: CalendarCheck, label: '今日规划' },
  { to: '/calendar', icon: CalendarDays, label: '日程视图' },
  { to: '/timer', icon: Timer, label: '计时器' },
  { to: '/projects', icon: FolderKanban, label: '项目' },
  { to: '/errors', icon: AlertTriangle, label: '错题' },
  { to: '/environments', icon: Globe, label: '环境' },
  { to: '/reports', icon: BarChart3, label: '报告' },
  { to: '/settings', icon: Settings, label: '设置' },
];

function NavItem({ item, collapsed }: { item: typeof navItems[number]; collapsed: boolean }) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleMouseEnter = useCallback(() => {
    const el = linkRef.current;
    if (!el) return;
    gsap.to(el, {
      x: 3,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      duration: 0.25,
      ease: 'power2.out',
      force3D: false,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = linkRef.current;
    if (!el) return;
    gsap.to(el, {
      x: 0,
      boxShadow: '0 0 0 rgba(0,0,0,0)',
      duration: 0.3,
      ease: 'power2.out',
      force3D: false,
    });
  }, []);

  const handleMouseDown = useCallback(() => {
    const el = linkRef.current;
    if (!el) return;
    gsap.to(el, { x: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', duration: 0.08, ease: 'power2.in', force3D: false });
  }, []);

  const handleMouseUp = useCallback(() => {
    const el = linkRef.current;
    if (!el) return;
    gsap.to(el, { x: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', duration: 0.2, ease: 'elastic.out(1, 0.4)', force3D: false });
  }, []);

  return (
    <NavLink
      ref={linkRef}
      to={item.to}
      end={item.to === '/'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={({ isActive }) => cn(
        'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
        'transition-colors duration-200',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        isActive && !collapsed && 'border-l-[3px] border-l-blue-500 pl-[9px]',
        isActive && collapsed && 'ring-2 ring-blue-500/50'
      )}
    >
      <item.icon size={20} />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const collapsed = useUIStore(s => s.sidebarCollapsed);
  const toggle = useUIStore(s => s.toggleSidebar);
  const personas = usePersonaStore(s => s.personas);
  const activeId = usePersonaStore(s => s.activePersonaId);
  const activePersona = personas.find(p => p.id === activeId);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const handleToggleEnter = useCallback(() => {
    gsap.to(toggleRef.current, { scale: 1.15, rotate: collapsed ? 8 : -8, duration: 0.3, ease: 'power2.out', force3D: false });
  }, [collapsed]);

  const handleToggleLeave = useCallback(() => {
    gsap.to(toggleRef.current, { scale: 1, rotate: 0, duration: 0.3, ease: 'power2.out', force3D: false });
  }, []);

  const handleToggleDown = useCallback(() => {
    gsap.to(toggleRef.current, { scale: 0.85, duration: 0.1, force3D: false });
  }, []);

  const handleToggleUp = useCallback(() => {
    gsap.to(toggleRef.current, { scale: 1.15, duration: 0.2, ease: 'elastic.out(1, 0.4)', force3D: false });
  }, []);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="h-screen sticky top-0 flex flex-col border-r bg-card shrink-0 overflow-hidden"
    >
      <div className={cn("flex items-center h-14 px-3 border-b", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-base text-blue-600"
          >
            学习规划器
          </motion.span>
        )}
        <button
          ref={toggleRef}
          onClick={toggle}
          onMouseEnter={handleToggleEnter}
          onMouseLeave={handleToggleLeave}
          onMouseDown={handleToggleDown}
          onMouseUp={handleToggleUp}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 450, damping: 30 }}
          >
            <NavItem item={item} collapsed={collapsed} />
          </motion.div>
        ))}
      </nav>

      {!collapsed && activePersona && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t p-3">
          <div className="flex items-center gap-2 text-sm">
            <span>{activePersona.avatarEmoji}</span>
            <span className="font-medium truncate">{activePersona.name}</span>
          </div>
        </motion.div>
      )}
      {collapsed && activePersona && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="border-t p-3 flex justify-center text-lg">
          {activePersona.avatarEmoji}
        </motion.div>
      )}
    </motion.aside>
  );
}
