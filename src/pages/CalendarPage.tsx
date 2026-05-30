import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { usePersonaStore } from '@/stores/personaStore';
import { useTimerStore } from '@/stores/timerStore';
import { useBlockStore } from '@/stores/blockStore';
import { db } from '@/db';
import { cn } from '@/utils/cn';
import { formatDurationCompact } from '@/utils/time';
import { Play, ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Block } from '@/types';

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const typeConfig: Record<string, { color: string; dot: string }> = {
  new_learning: { color: 'bg-blue-500', dot: 'bg-blue-500' },
  review: { color: 'bg-green-500', dot: 'bg-green-500' },
  error_problem: { color: 'bg-orange-500', dot: 'bg-orange-500' },
  exercise: { color: 'bg-purple-500', dot: 'bg-purple-500' },
};

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={14} className="text-green-500" />,
  in_progress: <Clock size={14} className="text-blue-500" />,
  scheduled: <Clock size={14} className="text-muted-foreground" />,
  skipped: <AlertCircle size={14} className="text-orange-400" />,
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const startTimer = useTimerStore(s => s.start);
  const updateBlockStatus = useBlockStore(s => s.updateBlockStatus);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<number>(0);

  const monthStart = new Date(currentMonth.year, currentMonth.month, 1);
  const monthEnd = new Date(currentMonth.year, currentMonth.month + 1, 0);
  const startEpoch = monthStart.getTime();
  const endEpoch = new Date(currentMonth.year, currentMonth.month + 1, 1).getTime();

  const monthBlocks = useLiveQuery(
    async () => {
      if (!activePersonaId) return [];
      return db.blocks
        .where({ personaId: activePersonaId })
        .filter(b => b.date >= startEpoch && b.date < endEpoch)
        .toArray();
    },
    [activePersonaId, startEpoch, endEpoch]
  ) ?? [];

  // Group blocks by date
  const blocksByDate = useMemo(() => {
    const map = new Map<number, Block[]>();
    for (const b of monthBlocks) {
      const dayKey = new Date(b.date).setHours(0, 0, 0, 0);
      const list = map.get(dayKey) || [];
      list.push(b);
      map.set(dayKey, list);
    }
    return map;
  }, [monthBlocks]);

  const selectedBlocks = selectedDate ? (blocksByDate.get(selectedDate) || []) : [];

  // Build calendar grid
  const startDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEpoch = today.getTime();

  const prevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
    setSelectedDate(0);
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
    setSelectedDate(0);
  };

  const handleStartBlock = (block: Block) => {
    startTimer(block.id, block.estimatedDurationMinutes);
    updateBlockStatus(block.id, 'in_progress');
    navigate('/timer');
  };

  const formatDayHeader = (epoch: number) => {
    const d = new Date(epoch);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const completedCount = selectedBlocks.filter(b => b.status === 'completed').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">日程视图</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>日程日历</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={prevMonth}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                {currentMonth.year}年{currentMonth.month + 1}月
              </span>
              <Button variant="ghost" size="sm" onClick={nextMonth}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {weekDays.map(d => (
                <div key={d} className="text-center text-xs text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before month start */}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEpoch = new Date(currentMonth.year, currentMonth.month, day).getTime();
                const dayBlocks = blocksByDate.get(dayEpoch) || [];
                const isToday = dayEpoch === todayEpoch;
                const isSelected = dayEpoch === selectedDate;
                const completedAll = dayBlocks.length > 0 && dayBlocks.every(b => b.status === 'completed');
                const hasBlocks = dayBlocks.length > 0;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? 0 : dayEpoch)}
                    className={cn(
                      'aspect-square rounded-lg border flex flex-col items-center justify-center relative transition-all',
                      isToday && 'border-blue-500 bg-blue-50 dark:bg-blue-950',
                      isSelected && 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900',
                      !isToday && !isSelected && 'border-transparent hover:border-border hover:bg-muted',
                      completedAll && 'bg-green-50 dark:bg-green-950 border-green-200'
                    )}
                  >
                    <span className={cn(
                      'text-sm font-medium',
                      isToday && 'text-blue-600 font-bold',
                      completedAll && 'text-green-600'
                    )}>
                      {day}
                    </span>
                    {hasBlocks && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayBlocks.slice(0, 3).map((b, bi) => {
                          const cfg = typeConfig[b.type];
                          return (
                            <span
                              key={bi}
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                b.status === 'completed' ? 'bg-green-400' : (cfg?.dot || 'bg-slate-400')
                              )}
                            />
                          );
                        })}
                        {dayBlocks.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">+{dayBlocks.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Detail */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selectedDate
                  ? `${formatDayHeader(selectedDate)} · ${selectedBlocks.length} 个块 · ${completedCount} 已完成`
                  : '点击日期查看详情'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {selectedBlocks.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6 text-muted-foreground"
                  >
                    <div className="text-2xl mb-2">📅</div>
                    <p className="text-xs">
                      {selectedDate ? '当天没有学习块' : '选择日历上的日期查看学习块'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="blocks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {selectedBlocks
                      .sort((a, b) => a.timeSlotStart.localeCompare(b.timeSlotStart))
                      .map(block => {
                        const cfg = typeConfig[block.type];
                        return (
                          <motion.div
                            key={block.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                              'p-3 rounded-lg border text-sm',
                              block.status === 'completed' && 'opacity-60',
                              block.status === 'skipped' && 'opacity-40 line-through'
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn('w-2 h-2 rounded-full shrink-0', cfg?.color || 'bg-slate-400')} />
                              <span className="font-medium truncate">{block.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {block.type === 'new_learning' ? '新学' :
                                 block.type === 'review' ? '复习' :
                                 block.type === 'error_problem' ? '错题' : '运动'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{block.timeSlotStart} - {block.timeSlotEnd}</span>
                              <span>·</span>
                              <span>{formatDurationCompact(block.estimatedDurationMinutes)}</span>
                              <span>·</span>
                              <span>{statusIcons[block.status]}</span>
                            </div>
                            {block.status === 'scheduled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="mt-2 w-full gap-1 text-xs"
                                onClick={() => handleStartBlock(block)}
                              >
                                <Play size={12} /> 开始此块
                              </Button>
                            )}
                          </motion.div>
                        );
                      })}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Month Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">月度统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold">{monthBlocks.filter(b => b.status === 'completed').length}</div>
                  <div className="text-[10px] text-muted-foreground">已完成块</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold">{monthBlocks.length}</div>
                  <div className="text-[10px] text-muted-foreground">总学习块</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold">{new Set(monthBlocks.map(b => new Date(b.date).setHours(0, 0, 0, 0))).size}</div>
                  <div className="text-[10px] text-muted-foreground">学习天数</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold">
                    {Math.round(monthBlocks.filter(b => b.status === 'completed').length / Math.max(1, monthBlocks.length) * 100)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">完成率</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
