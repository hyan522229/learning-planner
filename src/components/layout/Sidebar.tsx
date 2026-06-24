import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { usePersonaStore } from '@/stores/personaStore';
import {
  LayoutDashboard, BookOpen, CalendarCheck, Timer, FolderKanban,
  AlertTriangle, Globe, BarChart3, PieChart, Settings, ChevronLeft, ChevronRight, CalendarDays
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
  { to: '/analytics', icon: PieChart, label: '数据分析' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export function Sidebar() {
  const collapsed = useUIStore(s => s.sidebarCollapsed);
  const toggle = useUIStore(s => s.toggleSidebar);
  const personas = usePersonaStore(s => s.personas);
  const activeId = usePersonaStore(s => s.activePersonaId);
  const activePersona = personas.find(p => p.id === activeId);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="h-screen sticky top-0 flex flex-col border-r bg-background shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className={cn(
        "flex items-center h-14 px-3 border-b",
        collapsed ? "justify-center" : "justify-between",
      )}>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight">学习规划器</span>
        )}
        <button
          onClick={toggle}
          className={cn(
            "p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
            collapsed && "hidden",
          )}
          aria-label="收起侧栏"
        >
          <ChevronLeft size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              'flex items-center rounded-md text-sm transition-colors group',
              collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
              isActive
                ? 'bg-gray-100 dark:bg-gray-800 text-foreground font-medium'
                : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground',
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={collapsed ? 20 : 18} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t">
        {collapsed && (
          <div className="p-2 flex justify-center">
            <button
              onClick={toggle}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="展开侧栏"
            >
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}
        {activePersona && (
          <div className={cn("p-3", collapsed && "flex justify-center")}>
            {!collapsed ? (
              <div className="flex items-center gap-2.5">
                {activePersona.avatarImage ? (
                  <img src={activePersona.avatarImage} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                ) : (
                  <span
                    className="flex items-center justify-center w-7 h-7 rounded-full text-sm shrink-0"
                    style={{ backgroundColor: activePersona.color || '#0066cc' }}
                  >
                    {activePersona.avatarEmoji}
                  </span>
                )}
                <span className="text-sm font-medium truncate">{activePersona.name}</span>
              </div>
            ) : (
              activePersona.avatarImage ? (
                <img src={activePersona.avatarImage} className="w-7 h-7 rounded-full object-cover" alt="" />
              ) : (
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full text-sm"
                  style={{ backgroundColor: activePersona.color || '#0066cc' }}
                >
                  {activePersona.avatarEmoji}
                </span>
              )
            )}
          </div>
        )}
      </div>
    </motion.aside>
  );
}
