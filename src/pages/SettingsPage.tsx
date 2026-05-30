import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Input, Label, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { usePersonaStore } from '@/stores/personaStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { db } from '@/db';
import { Save, Trash2, Plus, Pencil, Check, X } from 'lucide-react';

export default function SettingsPage() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const personas = usePersonaStore(s => s.personas);
  const createPersona = usePersonaStore(s => s.createPersona);
  const settings = useSettingsStore(s => s.settings);
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const updateSettings = useSettingsStore(s => s.updateSettings);
  const subjects = useSubjectStore(s => s.subjects);
  const loadSubjects = useSubjectStore(s => s.loadSubjects);
  const addSubject = useSubjectStore(s => s.addSubject);
  const removeSubject = useSubjectStore(s => s.removeSubject);

  const [newPersonaName, setNewPersonaName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [deletePersonaId, setDeletePersonaId] = useState<string | null>(null);
  const [renamePersonaId, setRenamePersonaId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (activePersonaId) {
      loadSettings(activePersonaId);
      loadSubjects(activePersonaId);
    }
  }, [activePersonaId, loadSettings, loadSubjects]);

  const handleAddPersona = async () => {
    if (!newPersonaName.trim()) return;
    await createPersona(newPersonaName.trim(), '👤', '#6366f1');
    setNewPersonaName('');
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !activePersonaId) return;
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
    const color = colors[subjects.length % colors.length];
    await addSubject({
      personaId: activePersonaId,
      name: newSubjectName.trim(),
      priority: subjects.length + 1,
      color,
      dailyCapMinutes: 90,
      icon: 'book-open',
    });
    setNewSubjectName('');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">设置</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">通用设置</TabsTrigger>
          <TabsTrigger value="subjects">科目管理</TabsTrigger>
          <TabsTrigger value="personas">人物管理</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          {settings && (
            <>
              <Card>
                <CardHeader><CardTitle>每日限制</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>每日总学习上限</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20"
                        value={settings.dailyTotalCapMinutes / 60}
                        onChange={e => updateSettings({ dailyTotalCapMinutes: Number(e.target.value) * 60 })}
                      />
                      <span className="text-sm text-muted-foreground">小时</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>默认学习块时长</Label>
                    <select
                      value={settings.defaultBlockDuration}
                      onChange={e => updateSettings({ defaultBlockDuration: Number(e.target.value) as 30 | 45 })}
                      className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
                    >
                      <option value={30}>30 分钟</option>
                      <option value={45}>45 分钟</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>休息时长</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20"
                        value={settings.breakDurationMinutes}
                        onChange={e => updateSettings({ breakDurationMinutes: Number(e.target.value) })}
                      />
                      <span className="text-sm text-muted-foreground">分钟</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>计划规则</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>必须任务阈值</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20"
                        value={settings.mandatoryThresholdPercent}
                        onChange={e => updateSettings({ mandatoryThresholdPercent: Number(e.target.value) })}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>同科最小间隔</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20"
                        value={settings.sameSubjectMinGapMinutes / 60}
                        onChange={e => updateSettings({ sameSubjectMinGapMinutes: Number(e.target.value) * 60 })}
                      />
                      <span className="text-sm text-muted-foreground">小时</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>其他</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>每月豁免天数</Label>
                    <Input
                      type="number"
                      className="w-20"
                      value={settings.skipDaysPerMonth}
                      onChange={e => updateSettings({ skipDaysPerMonth: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>音效</Label>
                    <button
                      onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                      className={`h-6 w-11 rounded-full transition-colors ${settings.soundEnabled ? 'bg-brand-500' : 'bg-muted'}`}
                    >
                      <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${settings.soundEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>科目列表</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subjects.map(subject => (
                <div key={subject.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                    <span className="text-sm">{subject.name}</span>
                    <span className="text-xs text-muted-foreground">优先级 {subject.priority}</span>
                  </div>
                  <button
                    onClick={() => removeSubject(subject.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="新科目名称"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                />
                <Button onClick={handleAddSubject} size="sm"><Plus size={14} /> 添加</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personas">
          <Card>
            <CardHeader><CardTitle>人物列表</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {personas.map(p => {
                const isRenaming = renamePersonaId === p.id;
                return (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                    <span>{p.avatarEmoji}</span>
                    {isRenaming ? (
                      <>
                        <Input
                          className="h-7 text-sm flex-1"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              db.personas.update(p.id, { name: renameValue });
                              usePersonaStore.getState().loadPersonas();
                              setRenamePersonaId(null);
                            }
                          }}
                          autoFocus
                        />
                        <button onClick={() => {
                          db.personas.update(p.id, { name: renameValue });
                          usePersonaStore.getState().loadPersonas();
                          setRenamePersonaId(null);
                        }} className="p-1 text-success-500 hover:bg-success-50 rounded">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setRenamePersonaId(null)} className="p-1 text-muted-foreground hover:bg-muted rounded">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{p.name}</span>
                        <button
                          onClick={() => { setRenamePersonaId(p.id); setRenameValue(p.name); }}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="重命名"
                        >
                          <Pencil size={14} />
                        </button>
                        {personas.length > 1 && (
                          <button
                            onClick={() => setDeletePersonaId(p.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            title="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="新人物名称"
                  value={newPersonaName}
                  onChange={e => setNewPersonaName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPersona()}
                />
                <Button onClick={handleAddPersona} size="sm"><Plus size={14} /> 添加</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete persona confirmation */}
      <Dialog open={!!deletePersonaId} onOpenChange={(v) => { if (!v) setDeletePersonaId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除这个人物吗？该人物下的所有知识点、项目、错题等数据都会被永久删除，此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePersonaId(null)}>取消</Button>
            <Button variant="destructive" onClick={async () => {
              if (deletePersonaId) {
                await usePersonaStore.getState().deletePersona(deletePersonaId);
                setDeletePersonaId(null);
              }
            }}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
