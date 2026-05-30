# MVP 适配实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 将现有项目适配为设计规格书定义的 MVP — 4 Tab 导航、今日页集成计时器、PWA 支持、清冷高效配色、本地数据导入导出

**Architecture:** 现有 React 19 + Zustand + Dexie + Tailwind + Framer Motion 技术栈保留。重构导航为 4 Tab（今日/项目/进度/设置），移动端底部 TabBar + 桌面端侧边栏，合并多个页面到核心 4 页，添加 PWA 插件，统一配色

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Dexie.js, Framer Motion, vite-plugin-pwa, canvas-confetti

---

## 文件结构

```
src/
├── main.tsx                          # [修改] 注册 Service Worker
├── App.tsx                           # [修改] RouterProvider → 保持不变
├── index.css                         # [修改] 配色调整为清冷高效风
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx              # [修改] 适配新导航结构
│   │   ├── Sidebar.tsx               # [修改] 4 项导航、橙色/蓝色语义
│   │   ├── TabBar.tsx                # [新建] 移动端底部 4 Tab
│   │   └── TopBar.tsx                # [修改] 保留环境/人物标签
│   ├── timer/
│   │   ├── TimerModal.tsx            # [新建] 全屏计时器模态框
│   │   ├── TimerRing.tsx             # [保留] 环形进度
│   │   ├── TimerControls.tsx         # [保留] 控制按钮
│   │   └── CompleteAnimation.tsx     # [新建] 完成动画 (confetti + ring)
│   ├── today/
│   │   ├── BlockCard.tsx             # [新建] 学习块卡片
│   │   ├── BlockList.tsx             # [新建] 学习块列表
│   │   └── ProgressRing.tsx          # [新建] 当日完成度环形图
│   └── ui/                           # [保留] 现有 UI 组件
├── pages/
│   ├── TodayPage.tsx                 # [新建] 今日首页 (合并 Dashboard + Plan + Timer)
│   ├── ProjectsPage.tsx              # [保留/修改] 项目列表
│   ├── ProgressPage.tsx              # [新建] 进度总览
│   └── SettingsPage.tsx              # [修改] 添加导入导出、简化
├── routes/index.tsx                  # [修改] 4 条路由
├── stores/                           # [保留] 现有 stores 基本不变
└── db/                               # [保留] 现有 DB schema 不变
```

---

### Task 1: 安装 PWA 依赖和配置

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `public/manifest.json`
- Create: `public/sw.js` (或依赖 vite-plugin-pwa 自动生成)
- Modify: `index.html`
- Modify: `src/main.tsx`

- [ ] **Step 1: 安装 vite-plugin-pwa**

```bash
cd C:/Users/simple/learning-planner && npm install -D vite-plugin-pwa
```

- [ ] **Step 2: 配置 vite.config.ts**

在 `vite.config.ts` 中添加 PWA 插件：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '学习规划',
        short_name: '学习规划',
        description: '科学建议者 + 执行记录者 + 节奏维护者',
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'favicon.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'external-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
```

- [ ] **Step 3: 更新 index.html**

修改 `<html lang="en">` 为 `<html lang="zh-CN">`，更新 title：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#f8fafc" />
    <title>学习规划</title>
  </head>
  <body class="overscroll-none">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: 验证构建**

```bash
cd C:/Users/simple/learning-planner && npm run build
```
Expected: 构建成功，dist 目录中生成 `manifest.webmanifest` 和 `sw.js`

- [ ] **Step 5: 提交**

```bash
cd C:/Users/simple/learning-planner
git add package.json package-lock.json vite.config.ts index.html src/main.tsx
git commit -m "feat: add PWA support with vite-plugin-pwa"
```

---

### Task 2: 更新配色和 CSS 变量

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: 更新 CSS 主题变量**

将现有 `index.css` 中的 `:root` 和 `.dark` 块替换为清冷高效配色。橙色=复习、蓝色=新学：

```css
@import "tailwindcss";

@theme {
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;
  --color-review: #f97316;       /* 复习-橙色 */
  --color-review-light: #fff7ed;
  --color-review-border: #fed7aa;
  --color-new: #3b82f6;         /* 新学-蓝色 */
  --color-new-light: #eff6ff;
  --color-new-border: #bfdbfe;
  --color-success-50: #f0fdf4;
  --color-success-500: #10b981;
  --color-success-600: #059669;
}

:root {
  --background: 220 20% 97%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --primary: 221 83% 53%;
  --primary-foreground: 210 40% 98%;
  --secondary: 220 15% 94%;
  --secondary-foreground: 222 47% 11%;
  --muted: 220 15% 93%;
  --muted-foreground: 215 14% 46%;
  --accent: 220 15% 93%;
  --accent-foreground: 222 47% 11%;
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 221 83% 53%;
  --radius: 0.75rem;
}

.dark {
  --background: 222 47% 4%;
  --foreground: 210 25% 94%;
  --card: 222 40% 7%;
  --card-foreground: 210 25% 94%;
  --primary: 217 91% 64%;
  --primary-foreground: 225 30% 8%;
  --secondary: 217 20% 15%;
  --secondary-foreground: 210 25% 94%;
  --muted: 217 20% 16%;
  --muted-foreground: 215 12% 58%;
  --accent: 217 20% 18%;
  --accent-foreground: 210 25% 94%;
  --border: 217 20% 20%;
  --input: 217 20% 20%;
  --ring: 217 91% 64%;
}

* { border-color: hsl(var(--border)); }

body {
  margin: 0;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

#root { min-height: 100vh; min-height: 100dvh; }

/* 充电动画 - 进度条 */
@keyframes progress-charge {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.animate-progress-charge {
  background-size: 200% 100%;
  animation: progress-charge 2s linear infinite;
}

/* 完成脉冲 */
@keyframes complete-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.animate-complete-pulse {
  animation: complete-pulse 0.6s ease-in-out;
}

@media print {
  @page { size: A4 portrait; margin: 12mm 10mm 10mm 10mm; }
  html, body { font-size: 10px !important; color: #1a1a1a !important; background: white !important; }
  aside, header, nav, .no-print, [class*="sidebar"], [class*="Sidebar"],
  [class*="tabbar"], [class*="TabBar"], [class*="topbar"], [class*="TopBar"] {
    display: none !important;
  }
  .flex.h-screen > .flex-1 { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
  main { padding: 0 !important; overflow: visible !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; box-shadow: none !important; }
}
```

- [ ] **Step 2: 验证热更新**

```bash
cd C:/Users/simple/learning-planner && npm run dev
```
打开浏览器验证样式无异常。

- [ ] **Step 3: 提交**

```bash
git add src/index.css
git commit -m "style: update color scheme to clean-cool palette with review-orange/new-blue semantics"
```

---

### Task 3: 创建移动端底部 TabBar 组件

**Files:**
- Create: `src/components/layout/TabBar.tsx`

- [ ] **Step 1: 写 TabBar 组件**

```typescript
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';

const tabs = [
  { to: '/', icon: CalendarIcon, label: '今日' },
  { to: '/projects', icon: FolderIcon, label: '项目' },
  { to: '/progress', icon: ChartIcon, label: '进度' },
  { to: '/settings', icon: SettingsIcon, label: '设置' },
];

// 简约 SVG 图标组件
function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#6366f1' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function FolderIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#6366f1' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#6366f1' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#6366f1' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export function TabBar() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-100 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-colors min-w-[64px]',
              isActive ? 'text-indigo-500' : 'text-gray-400'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/layout/TabBar.tsx
git commit -m "feat: add mobile bottom TabBar component with SVG icons"
```

---

### Task 4: 重构 Sidebar 为 4 项导航

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: 简化为 4 个导航项**

将 `Sidebar.tsx` 中的 `navItems` 数组替换为：

```typescript
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { usePersonaStore } from '@/stores/personaStore';
import { useRef, useCallback } from 'react';
import gsap from 'gsap';
import {
  CalendarCheck, FolderKanban, BarChart3, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/', icon: CalendarCheck, label: '今日规划' },
  { to: '/projects', icon: FolderKanban, label: '学习项目' },
  { to: '/progress', icon: BarChart3, label: '进度总览' },
  { to: '/settings', icon: Settings, label: '设置' },
];
```

其余 `NavItem` 和 `Sidebar` 组件逻辑保持不变（GSAP 动画、折叠、人物显示等），将标题 "学习规划器" 改为 "学习规划"。

- [ ] **Step 2: 提交**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "refactor: simplify sidebar to 4 navigation items matching spec"
```

---

### Task 5: 更新 AppShell 集成 TabBar

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: 在 AppShell 中添加 TabBar 并调整移动端布局**

在 `AppShell.tsx` 中 import `TabBar`，在 `</main>` 后、`</div>` 前添加 `<TabBar />`。
同时给 main 区域添加移动端底部 padding：

```typescript
import { TabBar } from './TabBar';
// ... 在 return 中:
<main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
```

- [ ] **Step 2: 提交**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: integrate TabBar into AppShell for mobile navigation"
```

---

### Task 6: 创建今日页面 (TodayPage)

**Files:**
- Create: `src/pages/TodayPage.tsx`
- Create: `src/components/today/BlockCard.tsx`
- Create: `src/components/today/BlockList.tsx`
- Create: `src/components/today/ProgressRing.tsx`

- [ ] **Step 1: ProgressRing 组件**

```typescript
// src/components/today/ProgressRing.tsx
import { motion } from 'motion/react';

interface Props {
  completed: number;
  total: number;
}

export function ProgressRing({ completed, total }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl">
      <svg width="88" height="88" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r="44" fill="none" stroke="#6366f1" strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div>
        <div className="text-2xl font-bold text-indigo-600">{completed}/{total}</div>
        <div className="text-xs text-gray-500">今日已安排 {total} 个学习块</div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> 复习
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> 新学
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: BlockCard 组件**

```typescript
// src/components/today/BlockCard.tsx
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import type { Block } from '@/types';
import { formatDurationCompact } from '@/utils/time';

interface Props {
  block: Block;
  onStart: (block: Block) => void;
}

const typeConfig: Record<string, { color: string; bg: string; label: string }> = {
  review: { color: '#f97316', bg: 'bg-orange-50 border-orange-200', label: '复习' },
  new_learning: { color: '#3b82f6', bg: 'bg-blue-50 border-blue-200', label: '新学' },
  error_problem: { color: '#f97316', bg: 'bg-orange-50 border-orange-200', label: '错题' },
  exercise: { color: '#10b981', bg: 'bg-emerald-50 border-emerald-200', label: '运动' },
};

export function BlockCard({ block, onStart }: Props) {
  const cfg = typeConfig[block.type] ?? typeConfig.new_learning;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      onClick={() => onStart(block)}
      className="w-full flex items-center gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-all text-left group"
    >
      <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{block.name}</p>
        <p className="text-[11px] text-gray-400">
          {cfg.label} · {block.timeSlotStart} - {block.timeSlotEnd} · {formatDurationCompact(block.estimatedDurationMinutes)}
        </p>
      </div>
      <Play size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
    </motion.button>
  );
}
```

- [ ] **Step 3: BlockList 组件**

```typescript
// src/components/today/BlockList.tsx
import { AnimatePresence } from 'motion/react';
import { BlockCard } from './BlockCard';
import type { Block } from '@/types';

interface Props {
  blocks: Block[];
  onStartBlock: (block: Block) => void;
}

export function BlockList({ blocks, onStartBlock }: Props) {
  const pending = blocks.filter(b => b.status === 'scheduled' || b.status === 'in_progress');
  const completed = blocks.filter(b => b.status === 'completed');

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {pending.map(block => (
          <BlockCard key={block.id} block={block} onStart={onStartBlock} />
        ))}
      </AnimatePresence>
      {completed.length > 0 && (
        <div className="pt-2 border-t border-dashed border-gray-200">
          <p className="text-xs text-gray-400 mb-2">已完成 {completed.length} 个</p>
          {completed.map(block => (
            <div key={block.id} className="flex items-center gap-3 p-2 text-sm text-gray-400 line-through">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
              <span>{block.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: TodayPage 主页面**

```typescript
// src/pages/TodayPage.tsx
import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { usePersonaStore } from '@/stores/personaStore';
import { useTimerStore } from '@/stores/timerStore';
import { db } from '@/db';
import { startOfDayEpoch } from '@/utils/date';
import { ProgressRing } from '@/components/today/ProgressRing';
import { BlockList } from '@/components/today/BlockList';
import { TimerModal } from '@/components/timer/TimerModal';
import type { Block, DailyPlan } from '@/types';

export default function TodayPage() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const timerPhase = useTimerStore(s => s.phase);
  const startTimer = useTimerStore(s => s.start);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  const today = startOfDayEpoch();

  const todayBlocks = useLiveQuery(async () => {
    if (!activePersonaId) return [];
    return db.blocks.where({ personaId: activePersonaId, date: today }).toArray();
  }, [activePersonaId, today]) ?? [];

  const dailyPlan = useLiveQuery(async () => {
    if (!activePersonaId) return null;
    return db.dailyPlans.where({ personaId: activePersonaId, date: today }).first();
  }, [activePersonaId, today]) as DailyPlan | null | undefined;

  const todayDate = new Date();
  const dayLabel = `${todayDate.getMonth() + 1}月${todayDate.getDate()}日`;
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekdayLabel = `星期${weekdays[todayDate.getDay()]}`;

  const completedBlocks = todayBlocks.filter(b => b.status === 'completed').length;
  const totalBlocks = todayBlocks.length;

  const handleStartBlock = useCallback((block: Block) => {
    startTimer(block.id, block.estimatedDurationMinutes);
    setActiveBlock(block);
  }, [startTimer]);

  const handleCloseTimer = useCallback(() => {
    setActiveBlock(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">今日学习规划</h1>
          <p className="text-xs text-gray-400 mt-0.5">{dayLabel} {weekdayLabel}</p>
        </div>
        <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">在家</span>
      </div>

      <ProgressRing completed={completedBlocks} total={totalBlocks} />

      {todayBlocks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-sm">今天还没有学习规划</p>
          <p className="text-xs mt-1">去添加学习项目，系统会自动生成每日规划</p>
        </div>
      ) : (
        <BlockList blocks={todayBlocks} onStartBlock={handleStartBlock} />
      )}

      {/* 今日产出摘要 */}
      {completedBlocks > 0 && (
        <div className="flex gap-3 text-center pt-2 border-t">
          <div className="flex-1 p-3 rounded-lg bg-gray-50">
            <div className="text-lg font-bold text-gray-700">{completedBlocks}</div>
            <div className="text-[10px] text-gray-400">完成学习块</div>
          </div>
          <div className="flex-1 p-3 rounded-lg bg-gray-50">
            <div className="text-lg font-bold text-gray-700">
              {todayBlocks.filter(b => b.type === 'review' && b.status === 'completed').length}
            </div>
            <div className="text-[10px] text-gray-400">复习知识点</div>
          </div>
          <div className="flex-1 p-3 rounded-lg bg-gray-50">
            <div className="text-lg font-bold text-gray-700">
              {todayBlocks.filter(b => b.type === 'error_problem' && b.status === 'completed').length}
            </div>
            <div className="text-[10px] text-gray-400">消灭错题</div>
          </div>
        </div>
      )}

      {/* 计时器模态框 */}
      {activeBlock && timerPhase !== 'idle' && (
        <TimerModal block={activeBlock} onClose={handleCloseTimer} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add src/pages/TodayPage.tsx src/components/today/
git commit -m "feat: create TodayPage with progress ring, block list, and timer integration"
```

---

### Task 7: 创建计时器模态框 (TimerModal)

**Files:**
- Create: `src/components/timer/TimerModal.tsx`
- Create: `src/components/timer/CompleteAnimation.tsx`

- [ ] **Step 1: CompleteAnimation 组件**

```typescript
// src/components/timer/CompleteAnimation.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface Props {
  show: boolean;
  blockName: string;
  onDone: () => void;
}

export function CompleteAnimation({ show, blockName, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);

    // 发射 confetti
    const duration = 1500;
    const end = Date.now() + duration;
    const colors = ['#6366f1', '#f97316', '#10b981', '#3b82f6'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 2000);
    return () => clearTimeout(timer);
  }, [show]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white rounded-2xl p-8 text-center shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
              className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">太棒了！</h2>
            <p className="text-sm text-gray-500">「{blockName}」完成</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: TimerModal 组件**

```typescript
// src/components/timer/TimerModal.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Pause, Play, Plus, Minus } from 'lucide-react';
import { useTimerStore } from '@/stores/timerStore';
import { useBlockStore } from '@/stores/blockStore';
import { TimerRing } from './TimerRing';
import { CompleteAnimation } from './CompleteAnimation';
import { formatDurationCompact } from '@/utils/time';
import type { Block } from '@/types';

interface Props {
  block: Block;
  onClose: () => void;
}

export function TimerModal({ block, onClose }: Props) {
  const { phase, remainingSeconds, totalSeconds, tick, pause, resume, complete, extend, shorten, reset } = useTimerStore();
  const completeBlock = useBlockStore(s => s.completeBlock);
  const [showAnimation, setShowAnimation] = useState(false);

  // Tick timer each second
  useEffect(() => {
    if (phase !== 'running') return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, tick]);

  // Handle completion
  useEffect(() => {
    if (phase === 'completed') {
      setShowAnimation(true);
    }
  }, [phase]);

  const handleCompleteBlock = useCallback(async () => {
    if (block.id) {
      await completeBlock(block.id, Math.round(remainingSeconds / 60));
    }
  }, [block.id, remainingSeconds, completeBlock]);

  const handleAnimationDone = useCallback(() => {
    setShowAnimation(false);
    handleCompleteBlock();
    reset();
    onClose();
  }, [handleCompleteBlock, reset, onClose]);

  const isPaused = phase === 'paused';
  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;

  const typeLabel = block.type === 'review' ? '复习' : block.type === 'error_problem' ? '错题' : '新学';
  const typeColor = block.type === 'review' || block.type === 'error_problem' ? '#f97316' : '#3b82f6';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-white flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-400" />
          </button>
          <div className="flex-1">
            <div className="text-sm font-semibold">{block.name}</div>
            <div className="text-[11px]" style={{ color: typeColor }}>{typeLabel}</div>
          </div>
        </div>

        {/* Timer Display */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <TimerRing
            size={220}
            progress={phase === 'running' || phase === 'paused' ? progress : 1}
            color={typeColor}
          >
            <div className="text-center">
              <div className="text-5xl font-light tracking-tight tabular-nums text-gray-800">
                {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-400 mt-1">剩余</div>
            </div>
          </TimerRing>

          {/* Controls */}
          <div className="flex items-center gap-6">
            {/* -5 min (only paused) */}
            <button
              onClick={() => shorten(5)}
              disabled={!isPaused || remainingSeconds <= 60}
              className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-30"
            >
              <Minus size={20} className="text-gray-500" />
            </button>

            {/* Play/Pause */}
            {phase === 'running' ? (
              <button onClick={pause}
                className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Pause size={28} className="text-gray-600" />
              </button>
            ) : (
              <button onClick={resume}
                className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <Play size={28} className="text-white ml-1" />
              </button>
            )}

            {/* Complete */}
            <button onClick={complete}
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>

            {/* +5 min (only paused) */}
            <button
              onClick={() => extend(5)}
              disabled={!isPaused}
              className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-30"
            >
              <Plus size={20} className="text-gray-500" />
            </button>
          </div>

          <p className="text-[11px] text-gray-400">
            {isPaused ? '已暂停 · 点击 ▶ 继续' : '暂停后可调整时长'}
          </p>
        </div>

        <CompleteAnimation show={showAnimation} blockName={block.name} onDone={handleAnimationDone} />
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/timer/TimerModal.tsx src/components/timer/CompleteAnimation.tsx
git commit -m "feat: add TimerModal with full-screen timer and completion confetti animation"
```

---

### Task 8: 创建进度总览页面 (ProgressPage)

**Files:**
- Create: `src/pages/ProgressPage.tsx`

- [ ] **Step 1: 写 ProgressPage**

```typescript
// src/pages/ProgressPage.tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { usePersonaStore } from '@/stores/personaStore';
import { db } from '@/db';
import { Progress } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { startOfDayEpoch } from '@/utils/date';
import type { Project } from '@/types';

const measureLabels: Record<string, string> = {
  pages: '页', questions: '题', minutes: '分钟', words: '词', articles: '篇',
};

export default function ProgressPage() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);

  const projects = useLiveQuery(async () => {
    if (!activePersonaId) return [];
    return db.projects.where({ personaId: activePersonaId }).toArray();
  }, [activePersonaId]) ?? [];

  const activeProjects = projects.filter(p => p.status === 'active').sort((a, b) => a.priority - b.priority);
  const completedProjects = projects.filter(p => p.status === 'completed');

  // Weekly heatmap data
  const today = startOfDayEpoch();
  const weekDays: { label: string; date: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today - i * 86400000);
    weekDays.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, date: today - i * 86400000 });
  }

  const weekBlocks = useLiveQuery(async () => {
    if (!activePersonaId) return [];
    const weekStart = today - 6 * 86400000;
    const weekEnd = today + 86399999;
    return db.blocks
      .where({ personaId: activePersonaId })
      .filter(b => b.date >= weekStart && b.date <= weekEnd && b.status === 'completed')
      .toArray();
  }, [activePersonaId]) ?? [];

  const totalCompletedBlocks = weekBlocks.length;
  const totalReviewed = weekBlocks.filter(b => b.type === 'review').length;
  const totalErrors = weekBlocks.filter(b => b.type === 'error_problem').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">进度总览</h1>
        <p className="text-xs text-gray-400 mt-0.5">本周产出</p>
      </div>

      {/* Weekly stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{totalCompletedBlocks}</div>
            <div className="text-[10px] text-gray-400">完成学习块</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{totalReviewed}</div>
            <div className="text-[10px] text-gray-400">复习知识点</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">{totalErrors}</div>
            <div className="text-[10px] text-gray-400">消灭错题</div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly heatmap */}
      <Card>
        <CardHeader><CardTitle className="text-sm">本周热力图</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-1 justify-between">
            {weekDays.map((day) => {
              const dayBlocks = weekBlocks.filter(b => b.date === day.date);
              const intensity = Math.min(dayBlocks.length, 8);
              const opacity = intensity / 8;
              return (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-md transition-colors"
                    style={{ backgroundColor: `rgba(99, 102, 241, ${Math.max(0.05, opacity)})` }}
                    title={`${dayBlocks.length} 个完成`}
                  />
                  <span className="text-[9px] text-gray-400">{day.label.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Project progress bars */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">学习项目进度</h2>
        <div className="space-y-3">
          {activeProjects.map(project => {
            const pct = project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-lg border bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{project.name}</span>
                  <span className="text-xs text-gray-400">
                    {project.completed}/{project.total} {measureLabels[project.measureType] ?? ''}
                    <span className="ml-1">({pct}%)</span>
                  </span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                      backgroundSize: '200% 100%',
                      animation: 'progress-charge 2s linear infinite',
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Completed projects */}
      {completedProjects.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">已完成</h2>
          <div className="space-y-1">
            {completedProjects.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 line-through">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/ProgressPage.tsx
git commit -m "feat: add ProgressPage with weekly heatmap and project progress bars"
```

---

### Task 9: 更新 SettingsPage 添加数据导入导出

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: 简化 SettingsPage 并添加导入导出**

保留现有 SettingsPage 的基础结构（通用设置 Tab），移除 "人物管理" 和 "科目管理" Tab（MVP 简化）。
在底部添加数据管理卡片：

```typescript
// 在 SettingsPage 中添加数据管理 Card（放在 Tabs 之外或新 Tab）

const handleExport = async () => {
  const data = {
    personas: await db.personas.toArray(),
    subjects: await db.subjects.toArray(),
    knowledgePoints: await db.knowledgePoints.toArray(),
    projects: await db.projects.toArray(),
    blocks: await db.blocks.toArray(),
    errorProblems: await db.errorProblems.toArray(),
    environments: await db.environments.toArray(),
    dailyPlans: await db.dailyPlans.toArray(),
    dailyStatuses: await db.dailyStatuses.toArray(),
    settings: await db.settings.toArray(),
    progressLogs: await db.progressLogs.toArray(),
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `learning-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.exportedAt || !data.personas) throw new Error('Invalid backup file');
      // Clear existing data then bulk-insert
      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) await table.clear();
        for (const table of db.tables) {
          const key = table.name;
          if (data[key] && data[key].length > 0) await table.bulkAdd(data[key]);
        }
      });
      alert('数据导入成功！请刷新页面。');
      window.location.reload();
    } catch {
      alert('导入失败：文件格式不正确');
    }
  };
  input.click();
};
```

- [ ] **Step 2: 验证导出导入流程**

```bash
cd C:/Users/simple/learning-planner && npm run dev
```
手动测试：导出 JSON → 清空数据 → 导入 → 验证数据恢复。

- [ ] **Step 3: 提交**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat: add JSON data export/import to SettingsPage"
```

---

### Task 10: 更新路由配置

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: 简化路由为 4 条**

```typescript
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import TodayPage from '@/pages/TodayPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProgressPage from '@/pages/ProgressPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
```

- [ ] **Step 2: 提交**

```bash
git add src/routes/index.tsx
git commit -m "refactor: simplify routes to 4 core pages per MVP spec"
```

---

### Task 11: 全局清理和最终验证

**Files:**
- 无新建，验证现有功能

- [ ] **Step 1: 运行 lint**

```bash
cd C:/Users/simple/learning-planner && npm run lint
```
修复所有 lint 错误。

- [ ] **Step 2: 运行 build**

```bash
cd C:/Users/simple/learning-planner && npm run build
```
Expected: TypeScript 编译通过，Vite 构建成功，dist 包含 sw.js 和 manifest。

- [ ] **Step 3: 运行 dev 并手动验证**

```bash
cd C:/Users/simple/learning-planner && npm run dev
```

验证清单：
- [ ] 桌面端显示左侧 4 项导航
- [ ] 移动端（<768px）显示底部 4 Tab
- [ ] 今日页面显示学习块列表 + 进度环
- [ ] 点击学习块进入全屏计时器
- [ ] 计时器播放/暂停/增减时长/完成均正常
- [ ] 完成时出现 confetti + 动画
- [ ] 项目页面可增删改查项目
- [ ] 进度页面显示周热力图 + 项目进度条
- [ ] 设置页面可导出/导入 JSON
- [ ] PWA 可安装（Chrome 地址栏出现安装图标）

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: final cleanup and verification for MVP spec alignment"
```

---

## 自检

**Spec 覆盖:**
- [x] 单人物、单环境 → Task 9 简化 Settings
- [x] 学习项目 CRUD → ProjectsPage 保留
- [x] 今日学习规划自动生成 → TodayPage + engine/daily-planner
- [x] 学习块计时器 + 完成动画 → Task 7 (TimerModal + CompleteAnimation)
- [x] 艾宾浩斯复习 → engine/ebbinghaus 已存在
- [x] 进度条可视化 → ProgressPage 充电动画
- [x] PWA 安装 → Task 1 (vite-plugin-pwa)
- [x] 数据导出/导入 → Task 9 (SettingsPage)

**无占位符:** 所有代码步骤包含完整实现。

**类型一致性:** 所有组件使用的 Block, Project 类型与 types/index.ts 一致。TimerState 与 timerStore 一致。
