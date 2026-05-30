import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import { db } from '@/db';
import { formatDate, startOfDayEpoch } from '@/utils/date';
import { formatDurationCompact } from '@/utils/time';
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Block } from '@/types';

export default function ReportsPage() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const [monthOffset, setMonthOffset] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const targetMonth = addMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(targetMonth).getTime();
  const monthEnd = endOfMonth(targetMonth).getTime();

  const monthLabel = format(targetMonth, 'yyyy年M月', { locale: zhCN });

  const totalReviews = useLiveQuery(async () => {
    if (!activePersonaId) return 0;
    return db.knowledgePoints
      .where({ personaId: activePersonaId })
      .filter(kp => kp.updatedAt >= monthStart && kp.updatedAt <= monthEnd)
      .count();
  }, [activePersonaId, monthStart, monthEnd]) ?? 0;

  const completedBlocks = useLiveQuery(async () => {
    if (!activePersonaId) return 0;
    return db.blocks
      .where({ personaId: activePersonaId, status: 'completed' })
      .filter(b => !!(b.completedAt && b.completedAt >= monthStart && b.completedAt <= monthEnd))
      .count();
  }, [activePersonaId, monthStart, monthEnd]) ?? 0;

  const clearedErrors = useLiveQuery(async () => {
    if (!activePersonaId) return 0;
    return db.errorProblems
      .where({ personaId: activePersonaId, status: 'cleared' })
      .filter(e => e.createdAt >= monthStart && e.createdAt <= monthEnd)
      .count();
  }, [activePersonaId, monthStart, monthEnd]) ?? 0;

  // Simple bar chart with CSS
  const barMax = Math.max(totalReviews, completedBlocks, clearedErrors, 1);
  const bars = [
    { label: '复习知识点', value: totalReviews, color: 'bg-brand-500', icon: BookOpen },
    { label: '完成学习块', value: completedBlocks, color: 'bg-success-500', icon: CheckCircle2 },
    { label: '清除错题', value: clearedErrors, color: 'bg-warning-500', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">学习报告</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonthOffset(o => o - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-sm font-medium min-w-[100px] text-center">{monthLabel}</span>
          <Button variant="outline" size="sm" onClick={() => setMonthOffset(o => o + 1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {bars.map(bar => (
          <Card key={bar.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{bar.label}</CardTitle>
              <bar.icon size={16} className={bar.color.replace('bg-', 'text-')} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{bar.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>月度产出</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bars.map(bar => {
              const heightPercent = barMax > 0 ? (bar.value / barMax) * 100 : 0;
              return (
                <div key={bar.label} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-24 shrink-0">{bar.label}</span>
                  <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${heightPercent}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${bar.color}`}
                    />
                  </div>
                  <span className="text-sm font-mono w-8 text-right">{bar.value}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>质性总结</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {totalReviews === 0 && completedBlocks === 0
              ? '本月暂无学习记录。开始添加知识点并生成每日计划吧！'
              : `本月完成了 ${completedBlocks} 个学习块，复习了 ${totalReviews} 个知识点，清除了 ${clearedErrors} 道错题。${
                  totalReviews > 20 ? '复习节奏良好，继续保持！' :
                  totalReviews > 5 ? '复习节奏稳定，可以适当增加新学内容。' :
                  '可以考虑增加一些新知识点，让复习引擎运转起来。'
                }`
            }
          </p>
        </CardContent>
      </Card>

      {/* Completed blocks with delete */}
      <BlockList
        personaId={activePersonaId || ''}
        monthStart={monthStart}
        monthEnd={monthEnd}
        onDeleteRequest={setDeleteConfirmId}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(v) => { if (!v) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除这个已完成的学习块吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>取消</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteConfirmId) {
                await db.blocks.delete(deleteConfirmId);
                setDeleteConfirmId(null);
              }
            }}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BlockList({ personaId, monthStart, monthEnd, onDeleteRequest }: {
  personaId: string;
  monthStart: number;
  monthEnd: number;
  onDeleteRequest: (id: string) => void;
}) {
  const blocks = useLiveQuery(async () => {
    if (!personaId) return [];
    return db.blocks
      .where({ personaId, status: 'completed' })
      .filter(b => !!(b.completedAt && b.completedAt >= monthStart && b.completedAt <= monthEnd))
      .toArray();
  }, [personaId, monthStart, monthEnd]) ?? [];

  if (blocks.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>已完成的学习块</span>
          <span className="text-sm font-normal text-muted-foreground">{blocks.length} 个</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <AnimatePresence>
            {blocks.map((block: Block) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{block.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(block.date, 'MM/dd')} · {formatDurationCompact(block.estimatedDurationMinutes)}
                    {block.actualDurationMinutes ? ` · 实际 ${formatDurationCompact(block.actualDurationMinutes)}` : ''}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteRequest(block.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-2"
                  title="删除此记录"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
