import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import type { KnowledgePoint } from '@/types';
import { formatDate } from '@/utils/date';
import { Badge } from '@/components/ui';
import { Trash2 } from 'lucide-react';

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'flex items-center gap-4 px-4 py-3 rounded-xl border bg-card transition-shadow hover:shadow-sm',
        isDue && 'ring-2 ring-warning-500/50 border-warning-500/30',
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
          <span>下次复习 {formatDate(point.nextReviewDate, 'MM/dd')}</span>
        </div>
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
