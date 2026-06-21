import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import type { Block } from '@/types';
import { formatDurationCompact } from '@/utils/time';

interface Props {
  block: Block;
  onStart: (block: Block) => void;
}

const typeConfig: Record<string, { color: string; label: string }> = {
  review: { color: '#f97316', label: '复习' },
  new_learning: { color: '#3b82f6', label: '新学' },
  error_problem: { color: '#f97316', label: '错题' },
  exercise: { color: '#10b981', label: '运动' },
};

export function BlockCard({ block, onStart }: Props) {
  const cfg = typeConfig[block.type] ?? typeConfig.new_learning;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      onClick={() => onStart(block)}
      className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card transition-all duration-150 hover:bg-muted/30 active:scale-[0.98] text-left group relative overflow-hidden"
    >
      <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{block.name}</p>
        <p className="text-[11px] text-gray-400">
          {cfg.label} · {block.timeSlotStart} - {block.timeSlotEnd} · {formatDurationCompact(block.estimatedDurationMinutes)}
        </p>
      </div>
      <span className="mr-1 text-xs font-medium text-muted-foreground transition-opacity duration-500 group-hover:opacity-0 shrink-0">
        开始
      </span>
      <span className="absolute right-2 z-10 flex items-center justify-center w-7 h-7 rounded-sm shrink-0 transition-all duration-500 bg-muted group-hover:w-[calc(100%-1rem)] group-active:scale-95">
        <ChevronRight size={14} className="text-foreground shrink-0" />
      </span>
    </motion.button>
  );
}
