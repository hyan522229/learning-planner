import { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import { useTimerStore } from '@/stores/timerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { useDailyPlanStore } from '@/stores/dailyPlanStore';
import { db } from '@/db';
import { startOfDayEpoch } from '@/utils/date';
import { ProgressRing } from '@/components/today/ProgressRing';
import { BlockList } from '@/components/today/BlockList';
import { TimerModal } from '@/components/timer/TimerModal';
import type { Block } from '@/types';

export default function TodayPage() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const timerPhase = useTimerStore(s => s.phase);
  const startTimer = useTimerStore(s => s.start);
  const settings = useSettingsStore(s => s.settings);
  const environments = useEnvironmentStore(s => s.environments);
  const activeEnvironmentId = useEnvironmentStore(s => s.activeEnvironmentId);
  const generateTodayPlan = useDailyPlanStore(s => s.generateTodayPlan);
  const generating = useDailyPlanStore(s => s.generating);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationAttempted = useRef(false);

  const today = startOfDayEpoch();

  const todayBlocks = useLiveQuery(async () => {
    if (!activePersonaId) return [];
    return db.blocks.where({ personaId: activePersonaId, date: today }).toArray();
  }, [activePersonaId, today]) ?? [];

  const todayDate = new Date();
  const dayLabel = `${todayDate.getMonth() + 1}月${todayDate.getDate()}日`;
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekdayLabel = `星期${weekdays[todayDate.getDay()]}`;

  const completedBlocks = todayBlocks.filter(b => b.status === 'completed').length;
  const totalBlocks = todayBlocks.length;

  const activeEnv = environments.find(e => e.id === activeEnvironmentId);
  const canGenerate = activePersonaId && settings && activeEnv && !generating;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || isGenerating) return;
    setIsGenerating(true);
    try {
      await generateTodayPlan(activePersonaId, activeEnv, settings);
    } catch (e) {
      console.error('Plan generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, isGenerating, generateTodayPlan, activePersonaId, activeEnv, settings]);

  useEffect(() => {
    if (generationAttempted.current) return;
    if (!canGenerate) return;
    if (todayBlocks.length > 0) return;
    generationAttempted.current = true;
    handleGenerate();
  }, [canGenerate, todayBlocks.length, handleGenerate]);

  // Reset generation attempt when persona changes
  useEffect(() => {
    generationAttempted.current = false;
  }, [activePersonaId]);

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
        <div className="flex items-center gap-2">
          {activeEnv && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">{activeEnv.name}</span>
          )}
        </div>
      </div>

      {isGenerating ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="mb-4"
          >
            <RefreshCw size={28} className="text-indigo-400" />
          </motion.div>
          <p className="text-sm">正在生成今日学习规划...</p>
        </div>
      ) : (
        <>
          <ProgressRing completed={completedBlocks} total={totalBlocks} />

          {todayBlocks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">✏️</div>
              <p className="text-sm">今天还没有学习规划</p>
              <p className="text-xs mt-1 mb-4">去添加学习项目，或点击下方按钮自动生成</p>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-40"
              >
                <Sparkles size={16} />
                生成今日规划
              </button>
            </div>
          ) : (
            <BlockList blocks={todayBlocks} onStartBlock={handleStartBlock} />
          )}

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
        </>
      )}

      {activeBlock && timerPhase !== 'idle' && (
        <TimerModal block={activeBlock} onClose={handleCloseTimer} />
      )}
    </div>
  );
}
