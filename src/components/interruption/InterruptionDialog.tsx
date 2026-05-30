import { useState } from 'react';
import { Button, Input, Label, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { usePersonaStore } from '@/stores/personaStore';
import { trimToMinutes, shiftAllDates } from '@/engine/interruption';
import { useDailyPlanStore } from '@/stores/dailyPlanStore';
import { Minus, Clock, Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InterruptionDialog({ open, onClose }: Props) {
  const [tab, setTab] = useState('trim');
  const [maxMinutes, setMaxMinutes] = useState(120);
  const [delayDays, setDelayDays] = useState(1);
  const [processing, setProcessing] = useState(false);
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const loadPlan = useDailyPlanStore(s => s.loadTodayPlan);

  const handleTrim = async () => {
    if (!activePersonaId) return;
    setProcessing(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await trimToMinutes(activePersonaId, today.getTime(), maxMinutes);
    await loadPlan(activePersonaId);
    setProcessing(false);
    onClose();
  };

  const handleDelay = async () => {
    if (!activePersonaId) return;
    setProcessing(true);
    await shiftAllDates(activePersonaId, delayDays);
    await loadPlan(activePersonaId);
    setProcessing(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>中断处理</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="trim" className="flex-1 gap-1">
              <Minus size={14} /> 缩减
            </TabsTrigger>
            <TabsTrigger value="delay" className="flex-1 gap-1">
              <Clock size={14} /> 推迟
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trim" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              保留必须的复习任务，裁剪可选的新学任务
            </p>
            <div className="space-y-2">
              <Label>今天只能学多少分钟？</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="range"
                  min={30}
                  max={480}
                  step={15}
                  value={maxMinutes}
                  onChange={e => setMaxMinutes(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-16 text-right">{maxMinutes} min</span>
              </div>
            </div>
            <Button onClick={handleTrim} disabled={processing} className="w-full">
              <Zap size={14} /> 确认缩减
            </Button>
          </TabsContent>

          <TabsContent value="delay" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              所有未完成任务和复习节点同步后移，不标记为"逾期"
            </p>
            <div className="space-y-2">
              <Label>推迟天数</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={delayDays}
                onChange={e => setDelayDays(Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              恢复后的第一天只安排复习，不排新学
            </p>
            <Button onClick={handleDelay} disabled={processing} className="w-full">
              <Clock size={14} /> 推迟 {delayDays} 天
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
