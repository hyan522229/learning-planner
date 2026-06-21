import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui';
import { usePersonaStore } from '@/stores/personaStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { db } from '@/db';
import { cn } from '@/utils/cn';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, CalendarCheck, Target } from 'lucide-react';

// ─── Constants ───

type Period = 'day' | 'week' | 'month';

const BLOCK_TYPE_COLORS: Record<string, string> = {
  new_learning: '#5b9bd5', review: '#e8a854', error_problem: '#e0736a', exercise: '#6aab8e',
};

const PROJECT_PALETTE = [
  '#5b9bd5', '#e8a854', '#6aab8e', '#e0736a', '#8e7cc3',
  '#f0c75e', '#5daece', '#f09078', '#7ec4a0', '#a48cc7',
];

// ─── SVG Donut with Inline Labels ───

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ slices, size = 280 }: { slices: PieSlice[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 20;
  const innerR = outerR * 0.58;
  const labelR = outerR + 28;
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;

  const arcs = useMemo(() => {
    let cum = 0;
    return slices.map(sl => {
      const startAngle = (cum / total) * Math.PI * 2 - Math.PI / 2;
      cum += sl.value;
      const endAngle = (cum / total) * Math.PI * 2 - Math.PI / 2;
      const midAngle = (startAngle + endAngle) / 2;
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      const pct = Math.round((sl.value / total) * 100);

      // Arc path
      const x1 = cx + outerR * Math.cos(startAngle);
      const y1 = cy + outerR * Math.sin(startAngle);
      const x2 = cx + outerR * Math.cos(endAngle);
      const y2 = cy + outerR * Math.sin(endAngle);
      const ix1 = cx + innerR * Math.cos(startAngle);
      const iy1 = cy + innerR * Math.sin(startAngle);
      const ix2 = cx + innerR * Math.cos(endAngle);
      const iy2 = cy + innerR * Math.sin(endAngle);

      const path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;

      // Label position (outside the ring)
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);

      // Leader line: from outer ring to label
      const lineStartX = cx + (outerR + 3) * Math.cos(midAngle);
      const lineStartY = cy + (outerR + 3) * Math.sin(midAngle);

      const isRight = midAngle > -Math.PI / 2 && midAngle < Math.PI / 2;
      const textAnchor = isRight ? 'start' : 'end';

      return { ...sl, pct, path, lx, ly, lineStartX, lineStartY, textAnchor, midAngle };
    });
  }, [slices, total, cx, cy, outerR, innerR, labelR]);

  if (slices.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-muted-foreground">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.12} />
          <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.08} />
          <text x={cx} y={cy + 4} textAnchor="middle" className="fill-muted-foreground" fontSize={13}>暂无数据</text>
        </svg>
      </div>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* Arc segments */}
      {arcs.map((arc, i) => (
        <g key={arc.label}>
          <motion.path
            d={arc.path}
            fill={arc.color}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.35, ease: 'easeOut' }}
          />
          {/* Leader line */}
          {arc.pct >= 4 && (
            <>
              <motion.line
                x1={arc.lineStartX} y1={arc.lineStartY}
                x2={arc.lx} y2={arc.ly}
                stroke={arc.color}
                strokeWidth={1}
                opacity={0.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: i * 0.05 + 0.3 }}
              />
              <motion.text
                x={arc.lx + (arc.textAnchor === 'start' ? 5 : -5)}
                y={arc.ly + 4}
                textAnchor={arc.textAnchor as "start" | "end"}
                fill="currentColor"
                fontSize={11}
                fontWeight={500}
                className="fill-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 + 0.3 }}
              >
                {arc.label} {arc.value >= 60 ? `${(arc.value / 60).toFixed(1)}h` : `${arc.value}min`}
              </motion.text>
            </>
          )}
        </g>
      ))}

      {/* Center text */}
      <text x={cx} y={cy - 5} textAnchor="middle" className="fill-foreground" fontSize={15} fontWeight={700}>
        {total >= 60 ? `${(total / 60).toFixed(1)}h` : `${total}min`}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
        总时长
      </text>
    </svg>
  );
}

// ─── Main Page ───

export default function AnalyticsPage() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const [period, setPeriod] = useState<Period>('day');
  const [cursor, setCursor] = useState(() => new Date());

  const range = useMemo(() => {
    switch (period) {
      case 'day':
        return { start: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime(),
                 end: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59, 999).getTime() };
      case 'week': {
        const s = startOfWeek(cursor, { weekStartsOn: 1 });
        const e = endOfWeek(cursor, { weekStartsOn: 1 });
        return { start: s.getTime(), end: new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999).getTime() };
      }
      case 'month': {
        const s = startOfMonth(cursor);
        const e = endOfMonth(cursor);
        return { start: s.getTime(), end: new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999).getTime() };
      }
    }
  }, [period, cursor]);

  const prev = () => {
    switch (period) {
      case 'day': setCursor(c => subDays(c, 1)); break;
      case 'week': setCursor(c => subWeeks(c, 1)); break;
      case 'month': setCursor(c => subMonths(c, 1)); break;
    }
  };

  const next = () => {
    switch (period) {
      case 'day': setCursor(c => addDays(c, 1)); break;
      case 'week': setCursor(c => addWeeks(c, 1)); break;
      case 'month': setCursor(c => addMonths(c, 1)); break;
    }
  };

  const isCurrent = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'day': return format(cursor, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      case 'week': return format(startOfWeek(cursor, { weekStartsOn: 1 }), 'yyyy-MM-dd') === format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      case 'month': return format(cursor, 'yyyy-MM') === format(now, 'yyyy-MM');
    }
  }, [period, cursor]);

  const title = useMemo(() => {
    switch (period) {
      case 'day': return format(cursor, 'M月d日 EEEE', { locale: zhCN });
      case 'week': {
        const s = startOfWeek(cursor, { weekStartsOn: 1 });
        const e = endOfWeek(cursor, { weekStartsOn: 1 });
        return `${format(s, 'M/d')} - ${format(e, 'M/d')}`;
      }
      case 'month': return format(cursor, 'yyyy年M月', { locale: zhCN });
    }
  }, [period, cursor]);

  const blocks = useLiveQuery(
    async () => {
      if (!activePersonaId) return [];
      // Fetch all completed blocks for persona, then filter by date range.
      // Avoids Dexie compound-index between() edge cases that can miss or
      // include wrong blocks.
      return db.blocks
        .where({ personaId: activePersonaId, status: 'completed' })
        .filter(b => b.date >= range.start && b.date <= range.end)
        .toArray();
    },
    [activePersonaId, range.start, range.end]
  ) ?? [];

  const projects = useLiveQuery(
    async () => {
      if (!activePersonaId) return [];
      return db.projects.where({ personaId: activePersonaId }).toArray();
    },
    [activePersonaId]
  ) ?? [];

  const subjects = useSubjectStore(s => s.subjects);
  const loadSubjects = useSubjectStore(s => s.loadSubjects);
  useEffect(() => { if (activePersonaId) loadSubjects(activePersonaId); }, [activePersonaId, loadSubjects]);

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

  const stats = useMemo(() => {
    const totalMinutes = blocks.reduce((s, b) => s + (b.actualDurationMinutes || b.estimatedDurationMinutes || 0), 0);
    const studyDays = new Set(blocks.map(b => format(b.date, 'yyyy-MM-dd'))).size;

    // Project/chart grouping: include ALL blocks (review, error, etc.)
    // For blocks without projectId, use subject name or block name
    const byProjectMap: Map<string, number> = new Map();
    for (const b of blocks) {
      const dur = b.actualDurationMinutes || b.estimatedDurationMinutes || 0;
      let name: string;
      if (b.projectId) {
        const proj = projectMap.get(b.projectId);
        name = proj?.name || b.name;
      } else if (b.subjectId) {
        const subj = subjectMap.get(b.subjectId);
        name = subj ? `${subj.name}` : b.name;
      } else {
        name = b.name;
      }
      byProjectMap.set(name, (byProjectMap.get(name) || 0) + dur);
    }

    const projectSlices: PieSlice[] = Array.from(byProjectMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, minutes], i) => ({
        label: name,
        value: minutes,
        color: PROJECT_PALETTE[i % PROJECT_PALETTE.length],
      }));

    // Subject distribution
    const bySubjectMap: Map<string, number> = new Map();
    for (const b of blocks) {
      const dur = b.actualDurationMinutes || b.estimatedDurationMinutes || 0;
      const subjId = b.subjectId;
      const subjName = subjId ? (subjectMap.get(subjId)?.name || '未分类') : '未分类';
      bySubjectMap.set(subjName, (bySubjectMap.get(subjName) || 0) + dur);
    }

    const subjectSlices: PieSlice[] = Array.from(bySubjectMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, minutes], i) => ({
        label: name,
        value: minutes,
        color: PROJECT_PALETTE[i % PROJECT_PALETTE.length],
      }));

    return { totalMinutes, studyDays, projectSlices, subjectSlices };
  }, [blocks, projectMap, subjectMap]);

  return (
    <div className="space-y-6">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">数据分析</h1>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {([['day', '日'], ['week', '周'], ['month', '月']] as [Period, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                period === p
                  ? 'bg-white dark:bg-slate-800 text-foreground '
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Period Navigator */}
      <div className="flex items-center justify-center gap-4 select-none">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft size={22} />
        </button>
        <AnimatePresence mode="wait">
          <motion.span
            key={title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="text-lg font-semibold min-w-[160px] text-center"
          >
            {title}
          </motion.span>
        </AnimatePresence>
        <button
          onClick={next}
          disabled={isCurrent}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isCurrent ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:bg-muted',
          )}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { icon: Clock, color: 'blue', label: '总时长', value: stats.totalMinutes >= 60 ? `${(stats.totalMinutes / 60).toFixed(1)}h` : `${stats.totalMinutes}min` },
          { icon: CalendarCheck, color: 'green', label: '学习天数', value: `${stats.studyDays}天` },
          { icon: Target, color: 'amber', label: '日均', value: stats.studyDays > 0 ? (stats.totalMinutes / stats.studyDays >= 60 ? `${(stats.totalMinutes / stats.studyDays / 60).toFixed(1)}h` : `${Math.round(stats.totalMinutes / stats.studyDays)}min`) : '0min' },
        ] as const).map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center',
                s.color === 'blue' && 'bg-blue-100 dark:bg-blue-900/30',
                s.color === 'green' && 'bg-green-100 dark:bg-green-900/30',
                s.color === 'amber' && 'bg-amber-100 dark:bg-amber-900/30',
              )}>
                <s.icon size={18} className={cn(
                  s.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                  s.color === 'green' && 'text-green-600 dark:text-green-400',
                  s.color === 'amber' && 'text-amber-600 dark:text-amber-400',
                )} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold mb-3">项目分布</h3>
            <div className="flex justify-center">
              <DonutChart slices={stats.projectSlices} size={320} />
            </div>
            {blocks.length > 0 && (
              <div className="mt-3 space-y-1 max-h-72 overflow-y-auto">
                {[...blocks]
                  .sort((a, b) => (b.actualDurationMinutes || b.estimatedDurationMinutes || 0) - (a.actualDurationMinutes || a.estimatedDurationMinutes || 0))
                  .map(b => {
                    const dur = b.actualDurationMinutes || b.estimatedDurationMinutes || 0;
                    // Match block to its pie slice color
                    let sliceColor = '#94a3b8';
                    if (b.projectId) {
                      const proj = projectMap.get(b.projectId);
                      const name = proj?.name || b.name;
                      const idx = stats.projectSlices.findIndex(s => s.label === name);
                      if (idx >= 0) sliceColor = stats.projectSlices[idx].color;
                    } else {
                      const idx = stats.projectSlices.findIndex(s => s.label === b.name);
                      if (idx >= 0) sliceColor = stats.projectSlices[idx].color;
                    }
                    return (
                      <div key={b.id} className="flex items-center gap-2 text-sm py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sliceColor }} />
                        <span className="flex-1 truncate">{b.name}</span>
                        <span className="text-muted-foreground tabular-nums text-xs shrink-0">
                          {dur >= 60 ? `${(dur / 60).toFixed(1)}h` : `${dur}min`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold mb-3">学科分布</h3>
            <div className="flex justify-center">
              <DonutChart slices={stats.subjectSlices} size={320} />
            </div>
            {stats.subjectSlices.length > 0 && (
              <div className="mt-3 space-y-1">
                {stats.subjectSlices.map(s => {
                  const pct = stats.totalMinutes > 0 ? Math.round((s.value / stats.totalMinutes) * 100) : 0;
                  return (
                    <div key={s.label} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="flex-1">{s.label}</span>
                      <span className="text-muted-foreground tabular-nums text-xs">
                        {s.value >= 60 ? `${(s.value / 60).toFixed(1)}h` : `${s.value}min`}
                      </span>
                      <span className="text-muted-foreground tabular-nums text-xs w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Block detail list */}
        {blocks.length > 0 && (
          <Card className="md:col-span-2">
            <CardContent className="pt-5 pb-4">
              <h3 className="text-sm font-semibold mb-3">学习块明细</h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {[...blocks]
                  .sort((a, b) => (b.actualDurationMinutes || b.estimatedDurationMinutes || 0) - (a.actualDurationMinutes || a.estimatedDurationMinutes || 0))
                  .map(b => {
                    const dur = b.actualDurationMinutes || b.estimatedDurationMinutes || 0;
                    const subjName = b.subjectId ? (subjectMap.get(b.subjectId)?.name || '') : '';
                    return (
                      <div key={b.id} className="flex items-center gap-2 text-sm py-1">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: BLOCK_TYPE_COLORS[b.type] || '#94a3b8' }} />
                        <span className="flex-1 truncate">{b.name}</span>
                        {subjName && <span className="text-xs text-muted-foreground">{subjName}</span>}
                        <span className="text-muted-foreground tabular-nums text-xs">
                          {dur >= 60 ? `${(dur / 60).toFixed(1)}h` : `${dur}min`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
