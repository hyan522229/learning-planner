import { Button } from '@/components/ui';
import { Play, Pause, Plus, Minus, CheckCircle2, RotateCcw, Eye } from 'lucide-react';

interface Props {
  phase: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onExtend: () => void;
  onShorten: () => void;
  onComplete: () => void;
  onReset: () => void;
  onFocus: () => void;
}

export function TimerControls({
  phase, onStart, onPause, onResume, onExtend, onShorten, onComplete, onReset, onFocus,
}: Props) {
  const isRunning = phase === 'running';
  const isPaused = phase === 'paused';
  const isIdle = phase === 'idle';
  const isCompleted = phase === 'completed';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main play/pause/complete */}
      <div className="flex items-center gap-3">
        {isIdle && (
          <Button size="lg" onClick={onStart} className="gap-2 px-8">
            <Play size={20} />
            开始
          </Button>
        )}
        {isRunning && (
          <Button size="lg" variant="outline" onClick={onPause} className="gap-2 px-8">
            <Pause size={20} />
            暂停
          </Button>
        )}
        {isPaused && (
          <>
            <Button size="lg" onClick={onResume} className="gap-2 px-8">
              <Play size={20} />
              继续
            </Button>
            <Button size="lg" variant="outline" onClick={onComplete} className="gap-2">
              <CheckCircle2 size={20} />
              提前完成
            </Button>
          </>
        )}
        {isCompleted && (
          <Button size="lg" onClick={onReset} variant="outline" className="gap-2 px-8">
            <RotateCcw size={20} />
            重置
          </Button>
        )}
      </div>

      {/* Adjust time (running/paused) */}
      {(isRunning || isPaused) && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onShorten} title="减少5分钟">
            <Minus size={14} />
            <span className="text-xs">5min</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onExtend} title="增加5分钟">
            <Plus size={14} />
            <span className="text-xs">5min</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onFocus} title="专注模式">
            <Eye size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
