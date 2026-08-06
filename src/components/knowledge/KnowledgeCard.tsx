import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import type { KnowledgePoint } from '@/types';
import { formatDate } from '@/utils/date';
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { Trash2, Minus, Plus, Eye, RefreshCw } from 'lucide-react';
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
  const restartFromStage = useKnowledgeStore(s => s.restartFromStage);
  const [showInspector, setShowInspector] = useState(false);
  const [showRestart, setShowRestart] = useState(false);
  const [restartTarget, setRestartTarget] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);

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
  const sca = point.stageCompletedAt && point.stageCompletedAt.length === 10
    ? point.stageCompletedAt
    : Array.from({ length: 10 }, () => null as number | null);
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
          'flex items-center gap-3 px-4 py-3 rounded-xl border bg-card transition-all duration-150 hover:bg-muted/30',
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
            onClick={(e) => { e.stopPropagation(); handleChangeDuration(-1); }}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all"
            title="减少复习时长"
          >
            <Minus size={12} />
          </button>
          <span className="text-xs text-muted-foreground w-7 text-center font-medium tabular-nums select-none">
            {point.reviewDurationMinutes || 10}m
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleChangeDuration(1); }}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all"
            title="增加复习时长"
          >
            <Plus size={12} />
          </button>

          <button
            onClick={() => setShowInspector(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all"
            title="查看复习节点"
          >
            <Eye size={14} />
          </button>

          {/* Completion log button */}
          <button
            onClick={() => setShowLog(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all"
            title="完成记录"
          >
            <span className="text-[11px] font-mono">{sca.filter(t => t !== null).length}</span>
          </button>

          {/* Restart button */}
          {point.currentStage > 0 && (
            <button
              onClick={() => { setShowRestart(v => !v); setRestartTarget(null); }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 active:scale-90 transition-all"
              title="重新开始"
            >
              <RefreshCw size={14} />
            </button>
          )}

          <button
            onClick={() => onDelete(point.id)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all"
            title="删除知识点"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </motion.div>

      {/* Restart dropdown — on the card level, outside the inspector */}
      {showRestart && point.currentStage > 0 && (
        <div className="mt-2 p-3 rounded-lg border bg-muted/30 space-y-2">
          <p className="text-xs font-medium">因拖延过久重新开始</p>
          <p className="text-[11px] text-muted-foreground">从中断的节点重新开始，会清除该节点及之后的完成记录。</p>
          {restartTarget !== null ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">从 <strong>R{restartTarget + 1}</strong> 重新开始？</span>
              <Button size="sm" variant="destructive" onClick={() => { restartFromStage(point.id, restartTarget); setRestartTarget(null); setShowRestart(false); }}>确认</Button>
              <Button size="sm" variant="outline" onClick={() => { setRestartTarget(null); setShowRestart(false); }}>取消</Button>
            </div>
          ) : (
            <select
              value=""
              onChange={(e) => { const v = Number(e.target.value); if (v >= 0) setRestartTarget(v); }}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="">选择重新开始的节点...</option>
              {Array.from({ length: point.currentStage }, (_, i) => (
                <option key={i} value={i}>R{i + 1}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Completion log dialog — like project progress logs */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="sm:max-w-sm max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>完成记录 — {point.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            {Array.from({ length: 10 }, (_, i) => {
              const t = sca[i];
              if (!t) return null;
              return (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-card text-sm">
                  <span className="font-mono text-xs font-medium">R{i + 1}</span>
                  <span className="text-muted-foreground text-xs">{formatDate(t, 'yyyy/MM/dd HH:mm')}</span>
                </div>
              );
            })}
            {!sca.some(t => t !== null) && (
              <p className="text-sm text-muted-foreground text-center py-4">暂无完成记录</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* R-node inspector dialog */}
      <Dialog open={showInspector} onOpenChange={setShowInspector}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>复习节点 — {point.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span className="w-12">阶段</span>
              <span>日期（完成于）</span>
              <span>理论(参考)</span>
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
                  <div>
                    <span className={dateColor}>
                      {formatDate(displayDates[i], 'yyyy/MM/dd')}
                      {isPast && ' ✓'}
                    </span>
                    {isPast && sca[i] && (
                      <span className="text-[10px] text-muted-foreground block">
                        完成于 {formatDate(sca[i]!, 'MM/dd HH:mm')}
                      </span>
                    )}
                    {isPast && !sca[i] && (
                      <span className="text-[10px] text-amber-500 block">无完成记录</span>
                    )}
                  </div>
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
              {point.restartedFromStage !== undefined && (
                <span className="text-amber-600 dark:text-amber-400">
                  {' '}· 从 R{point.restartedFromStage + 1} 重新开始
                </span>
              )}
              {point.consecutiveCorrect > 0 && ` · 连续正确 ${point.consecutiveCorrect} 次`}
              {point.errorCount > 0 && ` · 当前出错 ${point.errorCount} 次`}
            </p>

            {/* Manual stage correction (emergency only) */}
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">手动修正阶段（应急）</p>
              <p className="text-[11px] text-muted-foreground">仅在数据损坏时使用。</p>
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
                      const planned = theoretical[newStage];
                      nextReviewDate = planned < now ? now + DAY_MS : planned;
                    }
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
            </div>

            <p className="text-[11px] text-muted-foreground">
              橙色日期 = 因推迟/提前而与理论计划有偏差。取消勾选 = 跳过该阶段。"无完成记录" = 数据异常。
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
