import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui';
import { useSound } from '@/hooks/useSound';
import { useConfetti } from '@/hooks/useConfetti';

interface Props {
  pointName: string;
  onSubmit: (rating: number) => void;
  onClose: () => void;
}

const ratingLabels: Record<number, { label: string; emoji: string; desc: string }> = {
  1: { label: '完全不记得', emoji: '😰', desc: '需要重新学习' },
  2: { label: '很模糊', emoji: '🤔', desc: '需要加强巩固' },
  3: { label: '有点印象', emoji: '🤨', desc: '再复习一下' },
  4: { label: '基本掌握', emoji: '😊', desc: '推进到下一阶段' },
  5: { label: '完全掌握', emoji: '🎯', desc: '轻松推进' },
};

export function ReviewRating({ pointName, onSubmit, onClose }: Props) {
  const [selected, setSelected] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const { play } = useSound();
  const { fire } = useConfetti();

  const handleSelect = (rating: number) => setSelected(rating);

  const handleSubmit = () => {
    if (selected === 0) return;
    setSubmitted(true);
    if (selected >= 4) {
      play('review-correct');
      fire('light');
    } else {
      play('review-wrong');
    }
    setTimeout(() => {
      onSubmit(selected);
      onClose();
    }, 800);
  };

  const isCorrect = selected >= 4;

  return (
    <div className="text-center space-y-5">
      <div>
        <h3 className="font-semibold text-lg">复习评价</h3>
        <p className="text-sm text-muted-foreground mt-1 truncate max-w-xs mx-auto">{pointName}</p>
      </div>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="done"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="space-y-2"
          >
            <motion.div
              className="text-5xl"
              initial={{ rotate: -10, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            >
              {isCorrect ? '🎉' : '💪'}
            </motion.div>
            <p className="text-sm text-muted-foreground">
              {isCorrect
                ? '已掌握！推进到下一复习阶段'
                : selected === 3
                  ? '再巩固一次吧'
                  : '在当前节点插入补练复习，明天再巩固一次'}
            </p>
          </motion.div>
        ) : (
          <motion.div key="stars" exit={{ scale: 0.8, opacity: 0 }} className="space-y-3">
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map(rating => (
                <motion.button
                  key={rating}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSelect(rating)}
                  className={cn(
                    'w-12 h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all',
                    rating >= 4 ? 'border-success-500/30 hover:bg-success-50' :
                    rating === 3 ? 'border-warning-500/30 hover:bg-warning-50' :
                    'border-muted hover:bg-danger-50',
                    selected === rating && (rating >= 4
                      ? 'bg-success-50 border-success-500 ring-2 ring-success-500/30 scale-105'
                      : rating === 3
                        ? 'bg-warning-50 border-warning-500 ring-2 ring-warning-500/30 scale-105'
                        : 'bg-danger-50 border-danger-500 ring-2 ring-danger-500/30 scale-105'
                    )
                  )}
                >
                  <span className="text-lg">{ratingLabels[rating].emoji}</span>
                  <span className="text-[10px] font-medium">{ratingLabels[rating].label}</span>
                </motion.button>
              ))}
            </div>
            {selected > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground"
              >
                {ratingLabels[selected].desc}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>跳过</Button>
        <Button size="sm" onClick={handleSubmit} disabled={selected === 0 || submitted}>
          确认
        </Button>
      </div>
    </div>
  );
}
