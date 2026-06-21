import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePersonaStore } from '@/stores/personaStore';
import { useDailyPlanStore } from '@/stores/dailyPlanStore';
import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ChevronLeft, ChevronRight, Printer, ArrowLeft } from 'lucide-react';
import { startOfDayEpoch } from '@/utils/date';
import { format, startOfWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { formatDurationCompact } from '@/utils/time';
import type { Block, DailyPlan } from '@/types';

const WEEKS_SHOWN = 4;
const DAY_MS = 86400000;

type TypeKey = 'new_learning' | 'review' | 'error_problem' | 'exercise';

const blockTypeInfo: Record<TypeKey, { label: string; bg: string; fg: string }> = {
  new_learning: { label: '新学', bg: '#dbeafe', fg: '#1d4ed8' },
  review:        { label: '复习', bg: '#dcfce7', fg: '#15803d' },
  error_problem: { label: '错题', bg: '#ffedd5', fg: '#c2410c' },
  exercise:      { label: '运动', bg: '#f3e8ff', fg: '#7e22ce' },
};

const screenTagColor: Record<TypeKey, string> = {
  new_learning: 'bg-blue-100 text-blue-700',
  review:        'bg-green-100 text-green-700',
  error_problem: 'bg-orange-100 text-orange-700',
  exercise:      'bg-purple-100 text-purple-700',
};

export default function WeeklyPlanPage() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const loadRangePlans = useDailyPlanStore(s => s.loadRangePlans);

  const [firstWeekStart, setFirstWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }).getTime(),
  );

  const [rangeData, setRangeData] = useState<Map<number, { plan: DailyPlan; blocks: Block[] }>>(new Map());

  const rangeStart = firstWeekStart;
  const rangeEnd = firstWeekStart + WEEKS_SHOWN * 7 * DAY_MS;

  useEffect(() => {
    if (activePersonaId) {
      loadRangePlans(activePersonaId, rangeStart, rangeEnd).then(setRangeData);
    }
  }, [activePersonaId, rangeStart, rangeEnd, loadRangePlans]);

  const todayWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();

  const weeks: { start: number; end: number; label: string; relativeLabel: string; isThisWeek: boolean; days: { ts: number; label: string; isToday: boolean }[] }[] = [];
  for (let w = 0; w < WEEKS_SHOWN; w++) {
    const ws = firstWeekStart + w * 7 * DAY_MS;
    const we = ws + 6 * DAY_MS;
    const isThisWeek = ws === todayWeekStart;
    const weekOffset = Math.round((ws - todayWeekStart) / (7 * DAY_MS));
    const relativeLabel = weekOffset === 0 ? '本周' : weekOffset === 1 ? '下周' : `第${weekOffset + 1}周`;
    weeks.push({
      start: ws,
      end: we,
      label: `${format(ws, 'M/d')} - ${format(we, 'M/d')}`,
      relativeLabel,
      isThisWeek,
      days: Array.from({ length: 7 }, (_, i) => {
        const ts = ws + i * DAY_MS;
        return {
          ts,
          label: format(ts, 'M/d EEE', { locale: zhCN }),
          isToday: startOfDayEpoch() === ts,
        };
      }),
    });
  }

  const allDays = weeks.flatMap(w => w.days);
  const totalBlocks = Array.from(rangeData.values()).reduce((sum, d) => sum + d.blocks.length, 0);
  const totalMinutes = Array.from(rangeData.values()).reduce(
    (sum, d) => sum + d.blocks.reduce((s, b) => s + b.estimatedDurationMinutes, 0), 0,
  );

  const rangeLabel = `${format(rangeStart, 'yyyy/M/d')} - ${format(rangeEnd - DAY_MS, 'M/d')}`;

  return (
    <div>
      {/* ============ Screen view ============ */}
      <div className="space-y-4 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/plan" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">周计划</h1>
              <p className="text-sm text-muted-foreground">{rangeLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFirstWeekStart(s => s - WEEKS_SHOWN * 7 * DAY_MS)}>
              <ChevronLeft size={14} /> 前{WEEKS_SHOWN}周
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFirstWeekStart(s => s + WEEKS_SHOWN * 7 * DAY_MS)}>
              后{WEEKS_SHOWN}周 <ChevronRight size={14} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer size={14} /> 打印 PDF
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/plan" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">今日</Link>
          <span className="text-sm font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 px-3 py-1.5 rounded-lg">周视图</span>
          <Link to="/plan/monthly" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">月视图</Link>
        </div>

        <Card className="mb-1">
          <CardHeader><CardTitle className="text-base">{WEEKS_SHOWN}周概览</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold">{rangeData.size}</div><div className="text-xs text-muted-foreground">计划天数</div></div>
              <div><div className="text-2xl font-bold">{totalBlocks}</div><div className="text-xs text-muted-foreground">学习块</div></div>
              <div><div className="text-2xl font-bold">{formatDurationCompact(totalMinutes)}</div><div className="text-xs text-muted-foreground">总时长</div></div>
            </div>
          </CardContent>
        </Card>

        {weeks.map((week) => {
          const weekBlockCount = week.days.reduce((sum, day) => {
            const data = rangeData.get(day.ts);
            return sum + (data?.blocks.length || 0);
          }, 0);

          return (
            <div key={week.start}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background/80 backdrop-blur py-1 z-10 flex items-center gap-2">
                <span className={week.isThisWeek ? 'text-brand-600 font-bold' : ''}>{week.relativeLabel}</span>
                <span className="font-normal text-xs opacity-60">{week.label}</span>
                {weekBlockCount > 0 && <span className="font-normal text-xs ml-auto">{weekBlockCount} 块</span>}
              </h3>
              <div className="space-y-1.5">
                {week.days.map(day => {
                  const data = rangeData.get(day.ts);
                  const blocks = data?.blocks || [];

                  return (
                    <Card key={day.ts} className={day.isToday ? 'ring-2 ring-brand-500/30 border-brand-400/40' : ''}>
                      <CardHeader className="pb-1 pt-2 px-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs flex items-center gap-2">
                            {day.label}
                            {day.isToday && <span className="text-[9px] bg-brand-500 text-white px-1.5 py-0.5 rounded font-medium">今天</span>}
                          </CardTitle>
                          {blocks.length > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              {blocks.length} 块 · {formatDurationCompact(blocks.reduce((s, b) => s + b.estimatedDurationMinutes, 0))}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      {blocks.length > 0 && (
                        <CardContent className="pb-2 px-3">
                          <div className="space-y-0.5">
                            {blocks.map(block => {
                              const info = blockTypeInfo[block.type as TypeKey] || blockTypeInfo.new_learning;
                              return (
                                <div key={block.id} className="flex items-center gap-1.5 p-1 rounded bg-muted/50 text-xs">
                                  <span className={screenTagColor[block.type as TypeKey] + ' text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0'}>
                                    {info.label}
                                  </span>
                                  <span className="truncate flex-1">{block.name}</span>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {block.timeSlotStart}-{block.timeSlotEnd}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {rangeData.size === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">暂无计划，请先在今日规划中生成总计划</p>
            <Link to="/plan" className="text-brand-500 text-sm mt-2 inline-block hover:underline">前往生成 →</Link>
          </div>
        )}
      </div>

      {/* ============ Print view ============ */}
      <div id="printable-plan" className="hidden" style={{ display: 'none' }}>
        <style>{`
          @media print {
            #printable-plan {
              display: block !important;
              font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
              color: #1a1a1a;
              line-height: 1.4;
            }
            #printable-plan .pw-title {
              font-size: 15pt;
              font-weight: 700;
              margin: 0 0 2pt 0;
              letter-spacing: 0.02em;
            }
            #printable-plan .pw-meta {
              font-size: 8pt;
              color: #666;
              margin: 0 0 8pt 0;
            }
            #printable-plan .pw-week-label {
              font-size: 9pt;
              font-weight: 600;
              color: #444;
              margin: 8pt 0 4pt 0;
              border-bottom: 0.5pt solid #ccc;
              padding-bottom: 2pt;
            }
            #printable-plan .pw-grid {
              display: grid;
              grid-template-columns: repeat(7, 1fr);
              gap: 4pt;
            }
            #printable-plan .pw-day {
              border: 1pt solid #d4d4d4;
              border-radius: 3pt;
              padding: 4pt 3pt 3pt 3pt;
              min-height: 60pt;
            }
            #printable-plan .pw-day--today {
              border: 1.5pt solid #3b82f6;
              background: #f8faff;
            }
            #printable-plan .pw-day-hd {
              font-size: 7pt;
              font-weight: 600;
              color: #444;
              padding-bottom: 2pt;
              margin-bottom: 2pt;
              border-bottom: 0.5pt solid #e5e5e5;
            }
            #printable-plan .pw-day--today .pw-day-hd {
              color: #1d4ed8;
              border-bottom-color: #bfdbfe;
            }
            #printable-plan .pw-block {
              font-size: 6.5pt;
              margin-bottom: 2pt;
              padding-bottom: 2pt;
              border-bottom: 0.5pt dotted #eee;
            }
            #printable-plan .pw-block:last-child {
              margin-bottom: 0;
              padding-bottom: 0;
              border-bottom: none;
            }
            #printable-plan .pw-tag {
              display: inline-block;
              font-size: 5pt;
              font-weight: 600;
              padding: 1pt 2pt;
              border-radius: 2pt;
              margin-bottom: 1pt;
            }
            #printable-plan .pw-name {
              font-weight: 500;
              margin-bottom: 0.5pt;
            }
            #printable-plan .pw-time {
              font-size: 5.5pt;
              color: #999;
            }
            #printable-plan .pw-empty {
              color: #bbb;
              font-size: 6.5pt;
              text-align: center;
              padding-top: 14pt;
            }
          }
        `}</style>

        <div className="pw-title">{rangeLabel} 计划</div>
        <div className="pw-meta">
          {rangeData.size} 天有安排 · {totalBlocks} 个学习块 · 共 {formatDurationCompact(totalMinutes)}
        </div>

        {weeks.map((week) => {
          const weekHasData = week.days.some(day => rangeData.has(day.ts));
          if (!weekHasData) return null;
          return (
            <div key={week.start}>
              <div className="pw-week-label">{week.relativeLabel} · {week.label}</div>
              <div className="pw-grid">
                {week.days.map(day => {
                  const data = rangeData.get(day.ts);
                  const blocks = data?.blocks || [];

                  return (
                    <div key={day.ts} className={`pw-day${day.isToday ? ' pw-day--today' : ''}`}>
                      <div className="pw-day-hd">{day.label}</div>
                      {blocks.length === 0 ? (
                        <div className="pw-empty">暂无安排</div>
                      ) : (
                        blocks.map(block => {
                          const info = blockTypeInfo[block.type as TypeKey] || blockTypeInfo.new_learning;
                          return (
                            <div key={block.id} className="pw-block">
                              <span className="pw-tag" style={{ background: info.bg, color: info.fg }}>
                                {info.label}
                              </span>
                              <div className="pw-name">{block.name}</div>
                              <div className="pw-time">
                                {block.timeSlotStart}-{block.timeSlotEnd} · {formatDurationCompact(block.estimatedDurationMinutes)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
