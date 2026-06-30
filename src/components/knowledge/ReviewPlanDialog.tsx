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
  onSave: (data: { initialStage: number; reviewDurationMinutes: number }) => void;
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
    // Ensure continuity: if a later stage is checked, all between should be checked too
    const firstChecked = next.indexOf(true);
    const lastChecked = next.lastIndexOf(true);
    if (firstChecked >= 0 && lastChecked >= 0) {
      for (let j = firstChecked; j <= lastChecked; j++) next[j] = true;
    }
    setChecked(next);
  };

  const firstChecked = checked.indexOf(true);
  const lastChecked = checked.lastIndexOf(true);

  const handleSave = () => {
    onSave({
      initialStage: Math.max(0, firstChecked),
      reviewDurationMinutes: Number(duration) || 10,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>设置复习计划</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            勾选你希望复习的 R 阶段，从第一个勾选的阶段开始复习。
          </p>
          <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
            {Array.from({ length: 10 }, (_, i) => {
              const interval = REVIEW_INTERVALS[i];
              const date = dates[i];
              const disabled = i > 0 && checked[i - 1] && i > (lastChecked >= 0 ? lastChecked : 0);
              // Disable if there's a gap (unchecked between two checked)
              const hasGap = i > firstChecked && !checked.slice(firstChecked, i).every(Boolean);
              return (
                <label
                  key={i}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors',
                    checked[i] ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted',
                    hasGap && 'opacity-50 pointer-events-none',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() => toggle(i)}
                    className="rounded"
                  />
                  <span className="flex-1">R{i + 1}</span>
                  <span className="text-[10px] text-muted-foreground">
                    +{interval}天
                  </span>
                </label>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            从 R{firstChecked + 1} 开始
            {firstChecked >= 0 && lastChecked >= 0 && firstChecked !== lastChecked && (
              <>，到 R{lastChecked + 1} 结束</>
            )}
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
