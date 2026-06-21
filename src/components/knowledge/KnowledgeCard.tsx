import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import type { KnowledgePoint } from '@/types';
import { formatDate } from '@/utils/date';
import { Badge } from '@/components/ui';
import { Trash2, Minus, Plus } from 'lucide-react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';

interface Props {
  point: KnowledgePoint;
  subjectName: string;
  subjectColor: string;
  onDelete: (id: string) => void;
}

const stageLabels: Record<number, string> = {
  0: 'R1',
  1: 'R1', 2: 'R2', 3: 'R3', 4: 'R4', 5: 'R5',
  6: 'R6', 7: 'R7', 8: 'R8', 9: 'R9', 10: '完成',
};

export function KnowledgeCard({ point, subjectName, subjectColor, onDelete }: Props) {
  const isDue = point.status === 'active' && point.nextReviewDate <= new Date().getTime();
  const isCompleted = point.status === 'completed';
  const updateReviewDuration = useKnowledgeStore(s => s.updateReviewDuration);

  const handleChangeDuration = (delta: number) => {
    const next = Math.max(1, Math.min(120, (point.reviewDurationMinutes || 10) + delta));
    updateReviewDuration(point.id, next);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border bg-card transition-all duration-150 hover:bg-muted/30 active:scale-[0.98]',
        isDue && 'ring-2 ring-amber-500/50 border-amber-500/30',
        isCompleted && 'opacity-60'
      )}
    >
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: isCompleted ? '#9ca3af' : subjectColor }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium text-sm truncate', isCompleted && 'line-through')}>
            {point.name}
          </span>
          {isDue && <Badge variant="warning">待复习</Badge>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{subjectName}</span>
          <span>·</span>
          <span>{stageLabels[point.currentStage] ?? `R${point.currentStage}`}</span>
          <span>·</span>
          <span>下次 {formatDate(point.nextReviewDate, 'MM/dd')}</span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => handleChangeDuration(-1)}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="减少复习时长"
        >
          <Minus size={12} />
        </button>
        <span className="text-xs text-muted-foreground w-7 text-center font-medium tabular-nums">
          {point.reviewDurationMinutes || 10}m
        </span>
        <button
          onClick={() => handleChangeDuration(1)}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="增加复习时长"
        >
          <Plus size={12} />
        </button>
      </div>

      <button
        onClick={() => onDelete(point.id)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}
