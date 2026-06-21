import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTimerStore } from '@/stores/timerStore';
import { useBlockStore } from '@/stores/blockStore';
import { useProjectStore } from '@/stores/projectStore';
import { useSound } from '@/hooks/useSound';
import { useConfetti } from '@/hooks/useConfetti';
import { TimerPanel, activeAudioCleanup } from '@/components/timer/TimerPanel';
import { RestTimer } from '@/components/timer/RestTimer';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Progress } from '@/components/ui';
import { StartButton } from '@/components/ui/StartButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { db } from '@/db';
import { formatDurationCompact } from '@/utils/time';
import { Play, Plus, ArrowLeft, Square } from 'lucide-react';

export default function TimerPage() {
  const navigate = useNavigate();
  const [showProgress, setShowProgress] = useState(false);
  const [progressAmount, setProgressAmount] = useState('');
  const [progressDuration, setProgressDuration] = useState('45');
  const [isAutoCompletion, setIsAutoCompletion] = useState(false);
  const prevPhase = useRef<string | null>(null);

  const currentBlockId = useTimerStore(s => s.currentBlockId);
  const phase = useTimerStore(s => s.phase);
  const totalSeconds = useTimerStore(s => s.totalSeconds);
  const remainingSeconds = useTimerStore(s => s.remainingSeconds);
  const lastElapsedSeconds = useTimerStore(s => s.lastElapsedSeconds);
  const start = useTimerStore(s => s.start);
  const updateBlockStatus = useBlockStore(s => s.updateBlockStatus);
  const updateProjectProgress = useProjectStore(s => s.updateProgress);
  const { play } = useSound();
  const { fire } = useConfetti();

  // Force re-render check for active audio
  const [, setTick] = useState(0);
  const stopAudio = () => {
    if (activeAudioCleanup.current) {
      activeAudioCleanup.current();
      activeAudioCleanup.current = null;
      setTick(t => t + 1);
    }
  };

  const currentBlock = useLiveQuery(
    async () => {
      if (!currentBlockId) return null;
      return db.blocks.get(currentBlockId);
    },
    [currentBlockId]
  );

  const currentProject = useLiveQuery(
    async () => {
      if (!currentBlock?.projectId) return null;
      return db.projects.get(currentBlock.projectId);
    },
    [currentBlock?.projectId]
  );

  // Auto-show progress dialog when timer completes with a linked project
  useEffect(() => {
    if (prevPhase.current !== 'completed' && phase === 'completed') {
      if (currentBlock?.projectId) {
        setProgressAmount('');
        // Auto-fill with elapsed time from timer (user can change)
        setProgressDuration(String(Math.round(lastElapsedSeconds / 60) || 1));
        setIsAutoCompletion(true);
        setShowProgress(true);
      }
      // Force re-render so "停止铃声" button appears
      setTick(t => t + 1);
    }
    if (phase !== 'completed') {
      // Clean up stale audio ref when phase changes away from completed
      if (activeAudioCleanup.current) {
        activeAudioCleanup.current = null;
        setTick(t => t + 1);
      }
    }
    prevPhase.current = phase;
  }, [phase, currentBlock?.projectId, lastElapsedSeconds]);

  const handleStartQuick = () => {
    play('timer-start');
    start('quick-' + Date.now(), 45);
  };

  const handleSaveProgress = async () => {
    const minutes = Number(progressDuration) || 45;
    if (currentBlock?.projectId && progressAmount) {
      const amount = Number(progressAmount);
      if (amount > 0) {
        await updateProjectProgress(currentBlock.projectId, amount, minutes);
        fire('medium');
        play('achievement');
      }
    }
    // Update block's actual duration to user-reported time
    if (currentBlock?.id) {
      await db.blocks.update(currentBlock.id, { actualDurationMinutes: minutes });
    }
    setShowProgress(false);
  };

  const handleSkipProgress = () => {
    setIsAutoCompletion(false);
    setShowProgress(false);
  };

  const handleDialogClose = () => {
    setIsAutoCompletion(false);
    setShowProgress(false);
  };

  const elapsedSeconds = totalSeconds - remainingSeconds;
  const elapsedCompact = formatDurationCompact(Math.floor(elapsedSeconds / 60));

  const projectProgress = currentProject
    ? Math.min(100, Math.round((currentProject.completed / currentProject.total) * 100))
    : 0;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">计时器</h1>
        {currentBlockId && phase === 'idle' && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/plan')}>
            <ArrowLeft size={14} /> 返回规划
          </Button>
        )}
      </div>

      {currentBlock && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">当前学习块</CardTitle>
            </div>
            {(phase === 'running' || phase === 'paused') && (
              <Button size="sm" variant="outline" onClick={() => {
                setProgressAmount('');
                setProgressDuration(String(Math.floor(elapsedSeconds / 60)));
                setIsAutoCompletion(false);
                setShowProgress(true);
              }}>
                <Plus size={14} /> 更新进度
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <p className="font-medium">{currentBlock.name}</p>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span>{currentBlock.timeSlotStart} - {currentBlock.timeSlotEnd}</span>
              <span>·</span>
              <span>预估 {formatDurationCompact(currentBlock.estimatedDurationMinutes)}</span>
              {phase !== 'idle' && (
                <>
                  <span>·</span>
                  <span>已过 {elapsedCompact}</span>
                </>
              )}
            </div>
            {currentProject && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">关联项目：{currentProject.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {currentProject.measureType === 'minutes'
                      ? `${formatDurationCompact(currentProject.completed)} / ${formatDurationCompact(currentProject.total)}`
                      : `${currentProject.completed} / ${currentProject.total}`}
                  </span>
                </div>
                <Progress value={projectProgress} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <TimerPanel />

      {activeAudioCleanup.current && (
        <Button onClick={stopAudio} variant="outline" size="sm" className="w-full gap-2 text-muted-foreground">
          <Square size={14} /> 停止铃声
        </Button>
      )}

      <RestTimer />

      {phase === 'idle' && !currentBlockId && (
        <div className="space-y-3">
          <StartButton onClick={handleStartQuick} variant="outline" size="lg">
            快速开始 45 分钟计时
          </StartButton>
          <p className="text-center text-sm text-muted-foreground">
            或从"今日规划"页面选择一个学习块来启动计时器
          </p>
        </div>
      )}

      {/* Progress update dialog - shown manually or auto after completion */}
      <Dialog open={showProgress} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
        <DialogContent
          className="sm:max-w-sm"
          onInteractOutside={isAutoCompletion ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={isAutoCompletion ? (e) => e.preventDefault() : undefined}
        >
          <DialogHeader>
            <DialogTitle>
              {phase === 'completed' ? '计时完成！更新进度' : '更新学习进度'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentProject && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium">{currentProject.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  当前进度：{currentProject.measureType === 'minutes'
                    ? formatDurationCompact(currentProject.completed)
                    : currentProject.completed} / {currentProject.measureType === 'minutes'
                    ? formatDurationCompact(currentProject.total)
                    : currentProject.total}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>完成了多少？</Label>
              <Input
                type="number"
                value={progressAmount}
                onChange={e => setProgressAmount(e.target.value)}
                min="0"
                autoFocus
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>花了多长时间（分钟）</Label>
              <Input
                type="number"
                value={progressDuration}
                onChange={e => setProgressDuration(e.target.value)}
                min="1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleSkipProgress}>
                {phase === 'completed' ? '跳过' : '取消'}
              </Button>
              <Button onClick={handleSaveProgress} disabled={!progressAmount || Number(progressAmount) <= 0}>
                确认更新
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
