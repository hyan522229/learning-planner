import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePersonaStore } from '@/stores/personaStore';
import { useDailyPlanStore } from '@/stores/dailyPlanStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, getDay, eachDayOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { formatDurationCompact } from '@/utils/time';
import type { DailyPlan } from '@/types';

export default function MonthlyPlanPage() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const loadMonthPlans = useDailyPlanStore(s => s.loadMonthPlans);

  const [monthDate, setMonthDate] = useState(new Date());
  const [monthPlans, setMonthPlans] = useState<Map<number, DailyPlan>>(new Map());

  const monthStart = startOfMonth(monthDate).getTime();
  const monthEnd = endOfMonth(monthDate).getTime();

  useEffect(() => {
    if (activePersonaId) {
      loadMonthPlans(activePersonaId, monthStart, monthEnd).then(setMonthPlans);
    }
  }, [activePersonaId, monthStart, monthEnd, loadMonthPlans]);

  const monthLabel = format(monthDate, 'yyyy年M月', { locale: zhCN });

  // Build calendar grid
  const firstDay = startOfMonth(monthDate);
  const lastDay = endOfMonth(monthDate);
  const startPad = getDay(firstDay); // 0=Sun
  const adjustedPad = startPad === 0 ? 6 : startPad - 1; // Make Monday first
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });

  const totalPlanDays = monthPlans.size;
  const totalBlocks = Array.from(monthPlans.values()).reduce((sum, p) => sum + p.blockIds.length, 0);
  const totalNewMinutes = Array.from(monthPlans.values()).reduce((sum, p) => sum + p.newLearningMinutes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/plan" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">月计划</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthDate(m => addMonths(m, -1))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium min-w-[100px] text-center">{monthLabel}</span>
          <button
            onClick={() => setMonthDate(m => addMonths(m, 1))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Navigation pills */}
      <div className="flex items-center gap-2">
        <Link
          to="/plan"
          className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          今日
        </Link>
        <Link
          to="/plan/weekly"
          className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          周视图
        </Link>
        <span className="text-sm font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 px-3 py-1.5 rounded-lg">
          月视图
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">计划天数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlanDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">学习块</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBlocks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">新学时长</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDurationCompact(totalNewMinutes)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="pt-5">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['一', '二', '三', '四', '五', '六', '日'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding days */}
            {Array.from({ length: adjustedPad }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}

            {days.map(day => {
              const ts = day.getTime();
              const plan = monthPlans.get(ts);
              const hasPlan = !!plan && plan.blockIds.length > 0;
              const isToday = format(new Date(), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

              return (
                <div
                  key={ts}
                  className={`
                    aspect-square rounded-lg border p-1.5 flex flex-col text-xs
                    ${hasPlan
                      ? 'border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-950/30'
                      : 'border-transparent bg-muted/30'
                    }
                    ${isToday ? 'ring-2 ring-brand-500/40' : ''}
                  `}
                >
                  <span className={`
                    font-medium mb-auto
                    ${isToday ? 'text-brand-600 dark:text-brand-400' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>
                  {hasPlan && (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span className="text-[10px] text-muted-foreground truncate">
                          {plan.blockIds.length}块
                        </span>
                      </div>
                      {plan.mandatoryMinutes > 0 && (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                          <span className="text-[10px] text-muted-foreground truncate">
                            复习 {formatDurationCompact(plan.mandatoryMinutes)}
                          </span>
                        </div>
                      )}
                      {plan.newLearningMinutes > 0 && (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                          <span className="text-[10px] text-muted-foreground truncate">
                            新学 {formatDurationCompact(plan.newLearningMinutes)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {monthPlans.size === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">本月暂无计划</p>
        </div>
      )}
    </div>
  );
}
