import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Input, Label, Badge } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Plus, Copy, Trash2, Check, GripVertical, Clock, Settings2 } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { generateId } from '@/utils/id';
import { cn } from '@/utils/cn';
import type { Environment, TimeSlotTemplate, BlockType } from '@/types';

const blockTypeLabels: Record<BlockType, string> = {
  new_learning: '新学', review: '复习', error_problem: '错题', exercise: '运动',
};

export default function EnvironmentsPage() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const environments = useEnvironmentStore(s => s.environments);
  const activeId = useEnvironmentStore(s => s.activeEnvironmentId);
  const loadEnvs = useEnvironmentStore(s => s.loadEnvironments);
  const setActive = useEnvironmentStore(s => s.setActiveEnvironment);
  const updateEnv = useEnvironmentStore(s => s.updateEnvironment);
  const deleteEnv = useEnvironmentStore(s => s.deleteEnvironment);
  const addEnv = useEnvironmentStore(s => s.addEnvironment);

  const [editingId, setEditingId] = useState<string | null>(null);
  const composingRef = useRef(false);

  useEffect(() => {
    if (activePersonaId) loadEnvs(activePersonaId);
  }, [activePersonaId, loadEnvs]);

  const editingEnv = editingId ? environments.find(e => e.id === editingId) : null;

  const startEdit = (id: string) => setEditingId(id);
  const closeEdit = () => setEditingId(null);

  const handleAddSlot = () => {
    if (!editingEnv) return;
    const newSlot: TimeSlotTemplate = {
      id: generateId(),
      label: '新时段',
      startTime: '08:00',
      endTime: '08:45',
      allowedSubjectIds: [],
      allowedBlockTypes: ['new_learning'],
      defaultDuration: 45,
    };
    updateEnv(editingEnv.id, { timeSlots: [...editingEnv.timeSlots, newSlot] });
  };

  const handleRemoveSlot = (slotId: string) => {
    if (!editingEnv) return;
    updateEnv(editingEnv.id, { timeSlots: editingEnv.timeSlots.filter(s => s.id !== slotId) });
  };

  const handleSlotChange = (slotId: string, field: string, value: unknown) => {
    if (!editingEnv) return;
    updateEnv(editingEnv.id, {
      timeSlots: editingEnv.timeSlots.map(s => s.id === slotId ? { ...s, [field]: value } : s),
    });
  };

  const handleToggleBlockType = (slotId: string, type: BlockType) => {
    if (!editingEnv) return;
    updateEnv(editingEnv.id, {
      timeSlots: editingEnv.timeSlots.map(s => {
        if (s.id !== slotId) return s;
        const types = s.allowedBlockTypes.includes(type)
          ? s.allowedBlockTypes.filter(t => t !== type)
          : [...s.allowedBlockTypes, type];
        return { ...s, allowedBlockTypes: types };
      }),
    });
  };

  const handleAddNewEnv = async () => {
    if (!activePersonaId) return;
    const id = await addEnv({
      personaId: activePersonaId,
      name: '新环境',
      timeSlots: [],
      restDurationMinutes: 10,
      lunchDurationMinutes: 30,
      isDefault: false,
    });
    setEditingId(id);
  };

  const totalMinutes = (env: Environment) => env.timeSlots.reduce((sum, s) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return sum + (eh * 60 + em) - (sh * 60 + sm);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">环境管理</h1>
          <p className="text-sm text-muted-foreground mt-1">环境 = 时间模板，切换环境时进度数据不变</p>
        </div>
        <Button onClick={handleAddNewEnv} size="sm"><Plus size={16} /> 新建环境</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {environments.map(env => (
            <motion.div key={env.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <Card className={cn(env.id === activeId && 'ring-2 ring-brand-500/30')}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{env.name}</CardTitle>
                      {env.isDefault && <Badge variant="secondary" className="text-[10px]">默认</Badge>}
                      {env.id === activeId && <Badge className="text-[10px] bg-brand-500">当前</Badge>}
                    </div>
                    <div className="flex gap-1">
                      {env.id !== activeId && (
                        <Button size="sm" variant="ghost" onClick={() => setActive(env.id)} title="启用">
                          <Check size={14} />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => startEdit(env.id)} title="编辑">
                        <Settings2 size={14} />
                      </Button>
                      {!env.isDefault && (
                        <Button size="sm" variant="ghost" onClick={() => deleteEnv(env.id)} title="删除">
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {env.timeSlots.slice(0, 5).map(slot => (
                      <div key={slot.id} className="flex justify-between">
                        <span>{slot.label}</span>
                        <span className="font-mono">{slot.startTime}-{slot.endTime}</span>
                      </div>
                    ))}
                    {env.timeSlots.length > 5 && (
                      <p className="text-muted-foreground/50">...还有 {env.timeSlots.length - 5} 个时段</p>
                    )}
                  </div>
                  <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                    <span>{env.timeSlots.length} 时段</span>
                    <span>{Math.floor(totalMinutes(env) / 60)}h{totalMinutes(env) % 60}m</span>
                    <span>休息 {env.restDurationMinutes}min</span>
                    <span>午休 {env.lunchDurationMinutes}min</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Environment Editor Dialog */}
      <Dialog open={!!editingId} onOpenChange={(v) => { if (!v) closeEdit(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑环境 - {editingEnv?.name}</DialogTitle>
          </DialogHeader>

          {editingEnv && (
            <div className="space-y-6">
              {/* Basic settings */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>环境名称</Label>
                  <Input
                    key={editingEnv.id}
                    defaultValue={editingEnv.name}
                    onChange={e => {
                      if (!composingRef.current) {
                        updateEnv(editingEnv.id, { name: e.target.value });
                      }
                    }}
                    onCompositionStart={() => { composingRef.current = true; }}
                    onCompositionEnd={e => {
                      composingRef.current = false;
                      updateEnv(editingEnv.id, { name: (e.target as HTMLInputElement).value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>课间休息 (分钟)</Label>
                  <Input
                    type="number"
                    value={editingEnv.restDurationMinutes}
                    onChange={e => updateEnv(editingEnv.id, { restDurationMinutes: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>午休时长 (分钟)</Label>
                  <Input
                    type="number"
                    value={editingEnv.lunchDurationMinutes}
                    onChange={e => updateEnv(editingEnv.id, { lunchDurationMinutes: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Time slots */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">学习时段</Label>
                  <Button size="sm" variant="outline" onClick={handleAddSlot}>
                    <Plus size={14} /> 添加时段
                  </Button>
                </div>

                <div className="space-y-2">
                  <AnimatePresence>
                    {editingEnv.timeSlots.map((slot, idx) => (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-muted-foreground shrink-0" />
                          <Input
                            className="flex-1 text-sm h-8"
                            placeholder="时段名称"
                            key={slot.id}
                            defaultValue={slot.label}
                            onChange={e => {
                              if (!composingRef.current) {
                                handleSlotChange(slot.id, 'label', e.target.value);
                              }
                            }}
                            onCompositionStart={() => { composingRef.current = true; }}
                            onCompositionEnd={e => {
                              composingRef.current = false;
                              handleSlotChange(slot.id, 'label', (e.target as HTMLInputElement).value);
                            }}
                          />
                          <div className="flex items-center gap-1">
                            <Input
                              type="time"
                              className="w-24 h-8 text-xs"
                              value={slot.startTime}
                              onChange={e => handleSlotChange(slot.id, 'startTime', e.target.value)}
                            />
                            <span className="text-xs text-muted-foreground">-</span>
                            <Input
                              type="time"
                              className="w-24 h-8 text-xs"
                              value={slot.endTime}
                              onChange={e => handleSlotChange(slot.id, 'endTime', e.target.value)}
                            />
                          </div>
                          <select
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                            value={slot.defaultDuration}
                            onChange={e => handleSlotChange(slot.id, 'defaultDuration', Number(e.target.value) as 30 | 45)}
                          >
                            <option value={30}>30min</option>
                            <option value={45}>45min</option>
                          </select>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveSlot(slot.id)}>
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </div>

                        {/* Block type toggles */}
                        <div className="flex gap-1.5">
                          {(Object.entries(blockTypeLabels) as [BlockType, string][]).map(([type, label]) => (
                            <button
                              key={type}
                              onClick={() => handleToggleBlockType(slot.id, type)}
                              className={cn(
                                'px-2 py-0.5 rounded text-[11px] border transition-colors',
                                slot.allowedBlockTypes.includes(type)
                                  ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950 dark:border-brand-700 dark:text-brand-300'
                                  : 'bg-muted border-transparent text-muted-foreground'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {editingEnv.timeSlots.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground border rounded-lg">
                      <Clock size={24} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">还没有设置时段，点击上方按钮添加</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
