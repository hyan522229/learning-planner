import { AnimatePresence, motion } from 'motion/react';
import type { Block } from '@/types';
import { BlockCard } from './BlockCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface Props {
  blocks: Block[];
  onStart: (block: Block) => void;
  onComplete: (block: Block) => void;
  onSkip: (block: Block) => void;
}

export function Timeline({ blocks, onStart, onComplete, onSkip }: Props) {
  if (blocks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>今日时间线</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm">还没有生成今日计划</p>
            <p className="text-xs mt-1">选择环境后点击"生成今日计划"</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group blocks by time slot for visual grouping
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          今日时间线
          <span className="text-sm font-normal text-muted-foreground ml-2">
            {blocks.filter(b => b.status === 'completed').length}/{blocks.length} 已完成
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence>
          {blocks.map((block, i) => (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <BlockCard
                block={block}
                onStart={onStart}
                onComplete={onComplete}
                onSkip={onSkip}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
