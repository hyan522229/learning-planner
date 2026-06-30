import { useState } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { calculateReviewDates } from '@/engine/ebbinghaus';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { initialStage: number; reviewDurationMinutes: number; enabledStages: boolean[] }) => void;
  defaultStage?: number;
  defaultDuration?: number;
}

const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60, 120, 240, 365];

export function ReviewPlanDialog({ open, onClose, onSave, defaultStage = 0, defaultDuration = 10 }: Props) {
  const today = Date.now();
  const dates = calculateReviewDates(today);
  const [checked, setChecked] = useState<boolean[]>(
    Array.from({ length: 10 }, (_, i) => i >= defaultStage)
  );
  const [duration, setDuration] = useState(String(defaultDuration));

  const toggle = (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
  };

  const firstChecked = checked.indexOf(true);
  const lastChecked = checked.lastIndexOf(true);

  const handleSave = () => {
    onSave({
      initialStage: Math.max(0, firstChecked),
      reviewDurationMinutes: Number(duration) || 10,
      enabledStages: checked,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>设置复习计划</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            勾选你希望复习的 R 阶段，从第一个勾选的阶段开始复习。
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {Array.from({ length: 10 }, (_, i) => {
              const interval = REVIEW_INTERVALS[i];
              return (
                <label
                  key={i}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm cursor-pointer transition-all',
                    checked[i]
                      ? 'bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-200'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() => toggle(i)}
                    className="rounded accent-blue-600"
                  />
                  <span className="flex-1 font-medium">R{i + 1}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(date, 'M/d')}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            选中 {checked.filter(Boolean).length} 个阶段
            {firstChecked >= 0 && <>，从 {format(dates[firstChecked], 'M月d日')} (R{firstChecked + 1}) 开始</>}
          </div>
          <div className="space-y-2">
            <Label>每次复习时长（分钟）</Label>
            <Input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              min={5}
              max={120}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleSave} disabled={firstChecked < 0}>确认设置</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
