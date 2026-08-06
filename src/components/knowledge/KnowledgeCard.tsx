import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import type { KnowledgePoint } from '@/types';
import { formatDate } from '@/utils/date';
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { Trash2, Minus, Plus, Eye } from 'lucide-react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { calculateReviewDates, projectedStageDate, DAY_MS } from '@/engine/ebbinghaus';
import { REVIEW_INTERVALS } from '@/engine/constants';

interface Props {
  point: KnowledgePoint;
  subjectName: string;
  subjectColor: string;
  onDelete: (id: string) => void;
}

const stageLabels: Record<number, string> = {
  0: 'R1', 1: 'R2', 2: 'R3', 3: 'R4', 4: 'R5',
  5: 'R6', 6: 'R7', 7: 'R8', 8: 'R9', 9: 'R10', 10: '完成',
};

/** Theoretical dates from study date — for reference comparison in the inspector */
const CUMULATIVE_LABELS = ['R1(第1天)','R2(第3天)','R3(第7天)','R4(第14天)','R5(第29天)','R6(第59天)','R7(第119天)','R8(第239天)','R9(第479天)','R10(第844天)'];

export function KnowledgeCard({ point, subjectName, subjectColor, onDelete }: Props) {
  const isDue = point.status === 'active' && point.nextReviewDate <= new Date().getTime();
  const isCompleted = point.status === 'completed';
  const updateReviewDuration = useKnowledgeStore(s => s.updateReviewDuration);
  const updateKnowledgePoint = useKnowledgeStore(s => s.updateKnowledgePoint);
  const [showInspector, setShowInspector] = useState(false);

  const handleChangeDuration = (delta: number) => {
    const next = Math.max(1, Math.min(120, (point.reviewDurationMinutes || 10) + delta));
    updateReviewDuration(point.id, next);
  };

  const handleToggleStage = (stageIndex: number) => {
    const enabled = point.enabledStages && point.enabledStages.length === 10
      ? [...point.enabledStages]
      : Array.from({ length: 10 }, () => true);
    enabled[stageIndex] = !enabled[stageIndex];
    updateKnowledgePoint(point.id, { enabledStages: enabled });
  };

  // Dates for each stage using projectedStageDate:
  // past = theoretical, current = nextReviewDate, future = projected from nextReviewDate
  const displayDates = Array.from({ length: 10 }, (_, i) => projectedStageDate(point, i));
  const theoreticalDates = calculateReviewDates(point.studyDate);
  const enabled = point.enabledStages && point.enabledStages.length === 10
    ? point.enabledStages
    : Array.from({ length: 10 }, () => true);

  return (
    <>
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
          onClick={() => setShowInspector(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="查看复习节点"
        >
          <Eye size={14} />
        </button>

        <button
          onClick={() => onDelete(point.id)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="删除知识点"
        >
          <Trash2 size={14} />
        </button>
      </motion.div>

      {/* R-node inspector dialog */}
      <Dialog open={showInspector} onOpenChange={setShowInspector}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>复习节点 — {point.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span className="w-12">阶段</span>
              <span>实际/预计日期</span>
              <span>理论日期(参考)</span>
              <span className="w-10 text-center">启用</span>
            </div>
            {Array.from({ length: 10 }, (_, i) => {
              const isPast = i < point.currentStage;
              const isCurrent = i === point.currentStage;
              const isFuture = i > point.currentStage;
              const shifted = displayDates[i] !== theoreticalDates[i];
              // Past = actual (black), future/projected = amber when shifted
              const dateColor = isPast
                ? 'text-foreground'
                : shifted
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-foreground';
              return (
                <div
                  key={i}
                  className={cn(
                    'grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center px-2 py-1.5 rounded text-sm',
                    isPast && 'bg-muted/30',
                    isCurrent && 'bg-brand-50 dark:bg-brand-950/30 font-medium',
                  )}
                >
                  <span className="w-12 font-mono text-xs">
                    R{i + 1}
                    {isCurrent && ' ←'}
                  </span>
                  <span className={dateColor}>
                    {formatDate(displayDates[i], 'yyyy/MM/dd')}
                    {isPast && ' ✓'}
                  </span>
                  <span className={cn(
                    'text-xs',
                    shifted ? 'text-amber-600/60 dark:text-amber-400/60' : 'text-muted-foreground',
                  )}>
                    {formatDate(theoreticalDates[i], 'yyyy/MM/dd')}
                    <span className="text-[10px] ml-1 opacity-60">{CUMULATIVE_LABELS[i]}</span>
                  </span>
                  <label className="w-10 flex justify-center">
                    <input
                      type="checkbox"
                      checked={enabled[i]}
                      onChange={() => handleToggleStage(i)}
                      className="w-3.5 h-3.5 rounded"
                    />
                  </label>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-1 border-t">
              当前阶段：{stageLabels[point.currentStage]}
              {point.status === 'completed' ? ' · 已完成全部复习' : ` · 下次复习 ${formatDate(point.nextReviewDate, 'yyyy/MM/dd')}`}
              {point.consecutiveCorrect > 0 && ` · 连续正确 ${point.consecutiveCorrect} 次`}
              {point.errorCount > 0 && ` · 当前出错 ${point.errorCount} 次`}
            </p>

            {/* Manual stage correction — for fixing corrupted data */}
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">手动修正阶段</p>
              <p className="text-[11px] text-muted-foreground">
                如果知识点阶段因程序错误被错误推进，可在此修正。选择正确的阶段后点击"应用"。
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={point.currentStage}
                  onChange={async (e) => {
                    const newStage = Number(e.target.value);
                    const now = Date.now();
                    const theoretical = calculateReviewDates(point.studyDate);

                    let nextReviewDate: number;
                    if (newStage >= 10) {
                      nextReviewDate = theoretical[9];
                    } else {
                      // Compare the theoretical date for this stage with now.
                      // If it's in the past, the review is overdue → schedule
                      // for tomorrow. Otherwise keep the theoretical date.
                      const planned = theoretical[newStage];
                      nextReviewDate = planned < now ? now + DAY_MS : planned;
                    }

                    // Keep reviewDates as pure theoretical from studyDate
                    updateKnowledgePoint(point.id, {
                      currentStage: newStage,
                      nextReviewDate,
                      reviewDates: theoretical,
                      status: newStage >= 10 ? 'completed' : 'active',
                      errorCount: 0,
                      errorAtStage: -1,
                      consecutiveCorrect: Math.min(point.consecutiveCorrect, newStage),
                    });
                  }}
                  className="text-sm border rounded px-2 py-1 bg-background"
                >
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 10 ? 'R10 (完成)' : `R${i + 1}`} — {i === 0 ? '从头开始' : i === 10 ? '全部完成' : `已完成 R1-R${i}`}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                ⚠ 修改阶段会立即生效，请确认选择正确的阶段。完成后建议重新生成今日计划。
              </p>
            </div>

            <p className="text-[11px] text-muted-foreground">
              黄色日期表示与理论计划有偏差（因推迟或提前复习）。取消勾选可跳过该阶段。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInspector(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
