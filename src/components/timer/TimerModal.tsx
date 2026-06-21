import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Pause, Play, Plus, Minus } from 'lucide-react';
import { useTimerStore } from '@/stores/timerStore';
import { useBlockStore } from '@/stores/blockStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useErrorProblemStore } from '@/stores/errorProblemStore';
import { useProjectStore } from '@/stores/projectStore';
import { db } from '@/db';
import { TimerRing } from './TimerRing';
import { CompleteAnimation } from './CompleteAnimation';
import { ReviewRating } from '@/components/knowledge/ReviewRating';
import type { Block } from '@/types';

interface Props {
  block: Block;
  onClose: () => void;
}

export function TimerModal({ block, onClose }: Props) {
  const { phase, remainingSeconds, totalSeconds, tick, pause, resume, complete, extend, shorten, reset } = useTimerStore();
  const updateBlockStatus = useBlockStore(s => s.updateBlockStatus);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showReviewRating, setShowReviewRating] = useState(false);

  useEffect(() => {
    if (phase !== 'running') return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, tick]);

  useEffect(() => {
    if (phase === 'completed') {
      setShowAnimation(true);
    }
  }, [phase]);

  const knowledgePointIds = block.knowledgePointIds || [];
  const errorProblemIds = block.errorProblemIds || [];
  const needsReviewRating = block.type === 'review' && knowledgePointIds.length > 0;

  const finalizeBlock = useCallback(async (reviewRating?: number) => {
    const state = useTimerStore.getState();
    const elapsedSeconds = state.totalSeconds - state.remainingSeconds;
    const actualDurationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    // Submit review ratings if provided (review blocks)
    if (reviewRating !== undefined && knowledgePointIds.length > 0) {
      for (const kpId of knowledgePointIds) {
        try {
          await useKnowledgeStore.getState().submitReview(kpId, reviewRating);
        } catch (e) {
          console.error('Failed to submit review for', kpId, e);
        }
      }
    }

    // Mark block as completed
    await updateBlockStatus(block.id, 'completed', actualDurationMinutes);

    // Update project progress for new_learning / exercise blocks
    if ((block.type === 'new_learning' || block.type === 'exercise') && block.projectId) {
      const project = await db.projects.get(block.projectId);
      if (project && project.status === 'active') {
        let estimatedAmount = 1;
        if (project.currentSpeedEWMA > 0) {
          estimatedAmount = Math.round((actualDurationMinutes / 60) * project.currentSpeedEWMA);
        }
        if (estimatedAmount > 0) {
          try {
            await useProjectStore.getState().updateProgress(block.projectId, estimatedAmount, actualDurationMinutes);
          } catch (e) {
            console.error('Failed to update project progress:', e);
          }
        }
      }
    }

    // Handle error problems
    if (block.type === 'error_problem' && errorProblemIds.length > 0) {
      for (const epId of errorProblemIds) {
        try {
          await useErrorProblemStore.getState().submitRedo(epId, true);
        } catch (e) {
          console.error('Failed to submit error redo for', epId, e);
        }
      }
    }

    reset();
    onClose();
  }, [block.id, block.type, block.projectId, knowledgePointIds, errorProblemIds, updateBlockStatus, reset, onClose]);

  const handleAnimationDone = useCallback(() => {
    setShowAnimation(false);
    if (needsReviewRating) {
      setShowReviewRating(true);
    } else {
      finalizeBlock();
    }
  }, [needsReviewRating, finalizeBlock]);

  const handleReviewSubmit = useCallback((rating: number) => {
    setShowReviewRating(false);
    finalizeBlock(rating);
  }, [finalizeBlock]);

  const handleReviewSkip = useCallback(() => {
    setShowReviewRating(false);
    finalizeBlock();
  }, [finalizeBlock]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const isPaused = phase === 'paused';
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;

  const typeLabels: Record<string, string> = {
    new_learning: '新学',
    review: '复习',
    error_problem: '错题',
    exercise: '练习',
  };
  const typeLabel = typeLabels[block.type] || block.type;
  const isReviewType = block.type === 'review' || block.type === 'error_problem';
  const typeColor = isReviewType ? '#f97316' : '#3b82f6';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-white flex flex-col"
      >
        <div className="flex items-center gap-3 p-4 border-b">
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-400" />
          </button>
          <div className="flex-1">
            <div className="text-sm font-semibold">{block.name}</div>
            <div className="text-[11px]" style={{ color: typeColor }}>{typeLabel}</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="relative inline-flex items-center justify-center">
            <TimerRing
              progress={phase === 'running' || phase === 'paused' ? progress : 1}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-light tracking-tight tabular-nums text-gray-800">
                  {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-400 mt-1">剩余</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => shorten(5)}
              disabled={!isPaused || remainingSeconds <= 60}
              className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-30"
            >
              <Minus size={20} className="text-gray-500" />
            </button>

            {phase === 'running' ? (
              <button onClick={pause}
                className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Pause size={28} className="text-gray-600" />
              </button>
            ) : (
              <button onClick={resume}
                className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <Play size={28} className="text-white ml-1" />
              </button>
            )}

            <button onClick={complete}
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>

            <button
              onClick={() => extend(5)}
              disabled={!isPaused}
              className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-30"
            >
              <Plus size={20} className="text-gray-500" />
            </button>
          </div>

          <p className="text-[11px] text-gray-400">
            {isPaused ? '已暂停 · 点击 ▶ 继续' : '暂停后可调整时长'}
          </p>
        </div>

        <CompleteAnimation show={showAnimation} blockName={block.name} onDone={handleAnimationDone} />

        {/* Review Rating Overlay */}
        <AnimatePresence>
          {showReviewRating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
              >
                <ReviewRating
                  pointName={block.name}
                  onSubmit={handleReviewSubmit}
                  onClose={handleReviewSkip}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
