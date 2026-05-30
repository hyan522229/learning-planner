import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import type { Block } from '@/types';
import { Button, Badge } from '@/components/ui';
import { Play, CheckCircle2, Clock, SkipForward } from 'lucide-react';

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  new_learning: { label: '新学', color: 'text-brand-600', bg: 'bg-brand-50 border-brand-200 dark:bg-brand-950 dark:border-brand-800' },
  review: { label: '复习', color: 'text-success-600', bg: 'bg-success-50 border-success-200 dark:bg-success-950 dark:border-success-800' },
  error_problem: { label: '错题', color: 'text-warning-500', bg: 'bg-warning-50 border-warning-200 dark:bg-warning-950 dark:border-warning-800' },
  exercise: { label: '运动', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800' },
};

interface Props {
  block: Block;
  onStart: (block: Block) => void;
  onComplete: (block: Block) => void;
  onSkip: (block: Block) => void;
}

export function BlockCard({ block, onStart, onComplete, onSkip }: Props) {
  const config = typeConfig[block.type] ?? typeConfig.new_learning;
  const isDone = block.status === 'completed';
  const isSkipped = block.status === 'skipped';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
        config.bg,
        isDone && 'opacity-50',
        isSkipped && 'opacity-40 line-through'
      )}
    >
      {/* Time */}
      <div className="text-xs font-mono text-muted-foreground shrink-0 w-16">
        <Clock size={12} className="inline mr-1" />
        {block.timeSlotStart}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium text-sm', isDone && 'line-through')}>
            {block.name}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {config.label}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {block.timeSlotStart} - {block.timeSlotEnd} · {block.estimatedDurationMinutes}分钟
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {block.status === 'scheduled' && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSkip(block)}
              title="跳过"
            >
              <SkipForward size={14} />
            </Button>
            <Button
              size="sm"
              onClick={() => onStart(block)}
            >
              <Play size={14} />
              开始
            </Button>
          </>
        )}
        {block.status === 'in_progress' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete(block)}
          >
            <CheckCircle2 size={14} />
            完成
          </Button>
        )}
        {isDone && (
          <span className="text-success-500">
            <CheckCircle2 size={18} />
          </span>
        )}
      </div>
    </motion.div>
  );
}
