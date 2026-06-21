import { AnimatePresence } from 'motion/react';
import { BlockCard } from './BlockCard';
import type { Block } from '@/types';

interface Props {
  blocks: Block[];
  onStartBlock: (block: Block) => void;
}

export function BlockList({ blocks, onStartBlock }: Props) {
  const pending = blocks.filter(b => b.status === 'scheduled' || b.status === 'in_progress');
  const completed = blocks.filter(b => b.status === 'completed');

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {pending.map(block => (
          <BlockCard key={block.id} block={block} onStart={onStartBlock} />
        ))}
      </AnimatePresence>
      {completed.length > 0 && (
        <div className="pt-2 border-t border-dashed border-gray-200">
          <p className="text-xs text-gray-400 mb-2">已完成 {completed.length} 个</p>
          {completed.map(block => (
            <div key={block.id} className="flex items-center gap-3 p-2 text-sm text-gray-400 line-through">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
              <span>{block.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
