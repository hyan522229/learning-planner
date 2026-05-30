import { useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { EnvironmentPicker } from '@/components/plan/EnvironmentPicker';
import { Timeline } from '@/components/plan/Timeline';
import { usePersonaStore } from '@/stores/personaStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { useDailyPlanStore } from '@/stores/dailyPlanStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useBlockStore } from '@/stores/blockStore';
import { useTimerStore } from '@/stores/timerStore';
import { RefreshCw, Loader2, ChevronRight, CalendarDays, CalendarRange } from 'lucide-react';
import type { Block } from '@/types';

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

  const totalPlanDays = fullPlanOutput?.totalDaysGenerated || 0;
  const activeProjectCount = fullPlanOutput
    ? Array.from(fullPlanOutput.dailyPlans.values())
        .flatMap(d => d.blocks)
        .filter(b => (b.type === 'new_learning' || b.type === 'exercise') && b.projectId)
        .reduce((set, b) => set.add(b.projectId!), new Set<string>()).size
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">今日规划</h1>
          {fullPlanOutput && totalPlanDays > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              已生成 {totalPlanDays} 天的总计划，覆盖 {activeProjectCount} 个项目
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EnvironmentPicker onSelect={() => {}} />
          <Button
            onClick={handleGenerate}
            disabled={generating || !activeEnvId}
            size="sm"
          >
            {generating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            生成总计划
          </Button>
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

      {warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-warning-50 border border-warning-500/20 text-sm text-warning-500 dark:bg-warning-500/10 dark:text-warning-400">
          {warnings.map((w, i) => <p key={i}>{w}</p>)}
        </div>
      )}

      <Timeline
        blocks={todayBlocks}
        onStart={handleStart}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </div>
  );
}
