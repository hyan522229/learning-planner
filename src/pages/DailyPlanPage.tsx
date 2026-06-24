import { useEffect, useCallback, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Label } from '@/components/ui';
import { StartButton } from '@/components/ui/StartButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { EnvironmentPicker } from '@/components/plan/EnvironmentPicker';
import { Timeline } from '@/components/plan/Timeline';
import { usePersonaStore } from '@/stores/personaStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { useDailyPlanStore } from '@/stores/dailyPlanStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useBlockStore } from '@/stores/blockStore';
import { useProjectStore } from '@/stores/projectStore';
import { useTimerStore } from '@/stores/timerStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { RefreshCw, Loader2, ChevronRight, CalendarDays, CalendarRange, ChevronLeft, Plus, Minus } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/utils/cn';
import { startOfDayEpoch } from '@/utils/date';
import type { Block, BlockType } from '@/types';

const DAY_MS = 86400000;
const DAY_PICKER_DAYS = 14;

export default function DailyPlanPage() {
  const navigate = useNavigate();
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const loadEnvironments = useEnvironmentStore(s => s.loadEnvironments);
  const environments = useEnvironmentStore(s => s.environments);
  const activeEnvId = useEnvironmentStore(s => s.activeEnvironmentId);
  const { todayBlocks, fullPlanOutput, warnings, generating, generateTodayPlan, loadTodayPlan } = useDailyPlanStore();
  const settings = useSettingsStore(s => s.settings);
  const updateBlockStatus = useBlockStore(s => s.updateBlockStatus);
  const startTimer = useTimerStore(s => s.start);

  const [selectedDate, setSelectedDate] = useState(() => startOfDayEpoch());
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [addBlockProjectId, setAddBlockProjectId] = useState('');
  const [addBlockDuration, setAddBlockDuration] = useState('45');
  const addBlock = useBlockStore(s => s.addBlock);
  const updateDailyBlockLimit = useProjectStore(s => s.updateDailyBlockLimit);
  const activeProjects = useLiveQuery(
    async () => {
      if (!activePersonaId) return [];
      return db.projects.where({ personaId: activePersonaId, status: 'active' }).toArray();
    },
    [activePersonaId]
  ) ?? [];

  useEffect(() => {
    if (activePersonaId) {
      loadEnvironments(activePersonaId);
    }
  }, [activePersonaId, loadEnvironments]);

  useEffect(() => {
    if (activePersonaId) {
      loadTodayPlan(activePersonaId);
    }
  }, [activePersonaId, loadTodayPlan]);

  const handleGenerate = useCallback(async () => {
    if (!activePersonaId || !activeEnvId || !settings) return;
    const env = environments.find(e => e.id === activeEnvId);
    if (!env) return;
    await generateTodayPlan(activePersonaId, env, settings);
  }, [activePersonaId, activeEnvId, settings, environments, generateTodayPlan]);

  const handleStart = (block: Block) => {
    startTimer(block.id, block.estimatedDurationMinutes);
    updateBlockStatus(block.id, 'in_progress');
    navigate('/timer');
  };

  const handleComplete = (block: Block) => {
    updateBlockStatus(block.id, 'completed', block.estimatedDurationMinutes);
  };

  const handleSkip = (block: Block) => {
    updateBlockStatus(block.id, 'skipped');
  };

  const handleAddBlock = async () => {
    const proj = activeProjects.find(p => p.id === addBlockProjectId);
    if (!proj || !activePersonaId) return;
    const blockType: BlockType = proj.category === 'exercise' ? 'exercise' : 'new_learning';
    await addBlock({
      personaId: activePersonaId,
      projectId: proj.id,
      subjectId: proj.subjectId,
      name: proj.name,
      type: blockType,
      estimatedDurationMinutes: Number(addBlockDuration) || 45,
      date: selectedDate,
    });
    setAddBlockProjectId('');
    setAddBlockDuration('45');
    setShowAddBlock(false);
  };

  // Build day picker data
  const today = startOfDayEpoch();
  const pickerDays = Array.from({ length: DAY_PICKER_DAYS }, (_, i) => {
    const ts = today + i * DAY_MS;
    const dayData = fullPlanOutput?.dailyPlans.get(ts);
    const blockCount = dayData?.blocks.length || 0;
    return {
      ts,
      label: format(ts, i === 0 ? '今天 M/d' : 'M/d EEE', { locale: zhCN }),
      dayOfWeek: format(ts, 'EEE', { locale: zhCN }),
      dayNum: format(ts, 'd'),
      hasPlan: blockCount > 0,
      blockCount,
    };
  });

  // Get blocks for selected date
  const selectedData = fullPlanOutput?.dailyPlans?.get(selectedDate);
  const displayBlocks = selectedDate === today ? todayBlocks : (selectedData?.blocks || []);
  const displayPlan = selectedDate === today
    ? (fullPlanOutput?.dailyPlans?.get(today)?.plan || null)
    : (selectedData?.plan || null);

  const totalPlanDays = fullPlanOutput?.totalDaysGenerated || 0;
  const activeProjectCount = fullPlanOutput
    ? Array.from(fullPlanOutput.dailyPlans.values())
        .flatMap(d => d.blocks)
        .filter(b => (b.type === 'new_learning' || b.type === 'exercise') && b.projectId)
        .reduce((set, b) => set.add(b.projectId!), new Set<string>()).size
    : 0;

  const isToday = selectedDate === today;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">今日规划</h1>
          {fullPlanOutput && totalPlanDays > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              已生成 {totalPlanDays} 天的总计划，覆盖 {activeProjectCount} 个项目
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <EnvironmentPicker onSelect={() => {}} />
          {generating ? (
            <Button disabled size="sm">
              <Loader2 size={16} className="animate-spin" />
              生成中...
            </Button>
          ) : (
            <StartButton
              onClick={handleGenerate}
              disabled={!activeEnvId}
              size="default"
            >
              生成总计划
            </StartButton>
          )}
        </div>
      </div>

      {/* View navigation pills */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 px-3 py-1.5 rounded-lg">
          今日
        </span>
        <Link
          to="/plan/weekly"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <CalendarDays size={14} />
          周视图
          <ChevronRight size={12} />
        </Link>
        <Link
          to="/plan/monthly"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <CalendarRange size={14} />
          月视图
          <ChevronRight size={12} />
        </Link>
      </div>

      {/* Day picker — horizontal scrollable day buttons */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {pickerDays.map(day => (
            <button
              key={day.ts}
              onClick={() => setSelectedDate(day.ts)}
              className={`
                flex flex-col items-center shrink-0 w-14 py-2 rounded-lg text-xs transition-colors
                ${day.ts === selectedDate
                  ? 'bg-primary text-primary-foreground'
                  : day.ts === today && day.ts !== selectedDate
                    ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                    : 'hover:bg-muted text-muted-foreground'
                }
              `}
            >
              <span className="text-[10px] font-medium">{day.dayOfWeek}</span>
              <span className="text-base font-bold">{day.dayNum}</span>
              {day.hasPlan && (
                <span className={`text-[9px] mt-0.5 ${day.ts === selectedDate ? 'text-white/80' : 'text-brand-500'}`}>
                  {day.blockCount}块
                </span>
              )}
            </button>
          ))}
        </div>

      {/* Selected date indicator */}
      {!isToday && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setSelectedDate(today)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={14} />
            回到今天
          </button>
          <span className="text-muted-foreground">
            查看 {format(selectedDate, 'M月d日 EEE', { locale: zhCN })} 的计划
          </span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-500/20 text-sm text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          {warnings.map((w, i) => <p key={i}>{w}</p>)}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">学习块</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddBlock(true)}
        >
          <Plus size={14} /> 添加
        </Button>
      </div>

      {/* Per-project daily block controls */}
      {(activeProjects.length > 0) && (() => {
        // Include ALL active projects
        const projectInfos = activeProjects.map(p => ({
          projectId: p.id,
          name: p.name,
          limit: p.dailyBlockLimit,
        }));
        if (projectInfos.length === 0) return null;

        const limitLabel = (limit: number) => {
          if (limit === -1) return '—';
          if (limit === 0) return '跳过';
          return String(limit);
        };

        return (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">学习块设置</h3>
            <div className="space-y-2">
              {projectInfos.map(info => (
                <div
                  key={info.projectId}
                  className={cn(
                    'flex items-center justify-between gap-3 py-1.5',
                    info.limit === 0 && 'opacity-50',
                  )}
                >
                  <span className="text-sm flex-1 min-w-0">{info.name}</span>
                  <span className={cn(
                    'text-sm tabular-nums w-12 text-center',
                    info.limit === 0 ? 'text-muted-foreground/50 line-through' : 'text-muted-foreground',
                  )}>
                    {limitLabel(info.limit)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => {
                        const next = info.limit === -1 ? -1 : Math.max(-1, info.limit - 1);
                        updateDailyBlockLimit(info.projectId, next);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-md border hover:bg-muted transition-colors"
                      title="减少"
                    >
                      <Minus size={13} />
                    </button>
                    <button
                      onClick={() => {
                        const next = info.limit === -1 ? 0 : info.limit + 1;
                        updateDailyBlockLimit(info.projectId, next);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-md border hover:bg-muted transition-colors"
                      title="增加"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <Timeline
        blocks={displayBlocks}
        onStart={handleStart}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />

      {displayBlocks.length === 0 && fullPlanOutput && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            {isToday ? '今日暂无安排' : `${format(selectedDate, 'M月d日', { locale: zhCN })} 暂无安排`}
          </p>
        </div>
      )}

      {/* Add Block Dialog */}
      <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>添加学习块</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择项目</Label>
              <select
                value={addBlockProjectId}
                onChange={e => setAddBlockProjectId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">选择项目</option>
                {activeProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>时长（分钟）</Label>
              <Input
                type="number"
                value={addBlockDuration}
                onChange={e => setAddBlockDuration(e.target.value)}
                min={5}
                max={180}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddBlock(false)}>取消</Button>
              <Button onClick={handleAddBlock} disabled={!addBlockProjectId}>添加</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
