import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Input, Label, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { usePersonaStore } from '@/stores/personaStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { db } from '@/db';
import { Save, Trash2, Plus, Pencil, Check, X, Download, Upload, Music, VolumeX, Camera } from 'lucide-react';
import { useAudioFiles } from '@/hooks/useAudioFiles';

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

  const { allFiles, addFile, removeFile, getByCategory } = useAudioFiles(activePersonaId ?? undefined);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [deletePersonaId, setDeletePersonaId] = useState<string | null>(null);
  const [renamePersonaId, setRenamePersonaId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const composingRef = useRef(false);
  const resetKeys = useRef({ subject: 0, persona: 0, rename: 0 });

  useEffect(() => {
    if (activePersonaId) {
      loadSettings(activePersonaId);
      loadSubjects(activePersonaId);
    }
  }, [activePersonaId, loadSettings, loadSubjects]);

  const handleAddPersona = async () => {
    if (!newPersonaName.trim()) return;
    await createPersona(newPersonaName.trim(), '➕', '#6366f1');
    setNewPersonaName('');
    resetKeys.current.persona++;
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
    resetKeys.current.subject++;
  };

  const handleExport = async () => {
    const data = {
      personas: await db.personas.toArray(),
      subjects: await db.subjects.toArray(),
      knowledgePoints: await db.knowledgePoints.toArray(),
      projects: await db.projects.toArray(),
      blocks: await db.blocks.toArray(),
      errorProblems: await db.errorProblems.toArray(),
      environments: await db.environments.toArray(),
      dailyPlans: await db.dailyPlans.toArray(),
      dailyStatuses: await db.dailyStatuses.toArray(),
      settings: await db.settings.toArray(),
      progressLogs: await db.progressLogs.toArray(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.exportedAt || !data.personas) throw new Error('Invalid backup file');
        await db.transaction('rw', db.tables, async () => {
          for (const table of db.tables) await table.clear();
          for (const table of db.tables) {
            const key = table.name;
            if (data[key] && data[key].length > 0) await table.bulkAdd(data[key]);
          }
        });
        alert('数据导入成功！请刷新页面。');
        window.location.reload();
      } catch {
        alert('导入失败：文件格式不正确');
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">设置</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">通用设置</TabsTrigger>
          <TabsTrigger value="subjects">科目管理</TabsTrigger>
          <TabsTrigger value="personas">人物管理</TabsTrigger>
          <TabsTrigger value="audio">音频设置</TabsTrigger>
          <TabsTrigger value="data">数据管理</TabsTrigger>
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
                  <div className="flex items-center justify-between">
                    <Label>任务完成音乐</Label>
                    <button
                      onClick={() => updateSettings({ taskCompleteMusicEnabled: !settings.taskCompleteMusicEnabled })}
                      className={`h-6 w-11 rounded-full transition-colors ${settings.taskCompleteMusicEnabled ? 'bg-brand-500' : 'bg-muted'}`}
                    >
                      <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${settings.taskCompleteMusicEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>休息结束闹铃</Label>
                    <button
                      onClick={() => updateSettings({ restAlarmEnabled: !settings.restAlarmEnabled })}
                      className={`h-6 w-11 rounded-full transition-colors ${settings.restAlarmEnabled ? 'bg-brand-500' : 'bg-muted'}`}
                    >
                      <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${settings.restAlarmEnabled ? 'translate-x-5' : ''}`} />
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
                  key={`subj-${resetKeys.current.subject}`}
                  defaultValue=""
                  onChange={e => { if (!composingRef.current) setNewSubjectName(e.target.value); }}
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={e => { composingRef.current = false; setNewSubjectName((e.target as HTMLInputElement).value); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !composingRef.current) handleAddSubject(); }}
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
                const handleAvatarUpload = () => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                      await db.personas.update(p.id, { avatarImage: reader.result as string });
                      usePersonaStore.getState().loadPersonas();
                    };
                    reader.readAsDataURL(file);
                  };
                  input.click();
                };
                return (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                    <button
                      onClick={handleAvatarUpload}
                      className="relative shrink-0 group"
                      title="更换头像"
                    >
                      {p.avatarImage ? (
                        <img src={p.avatarImage} className="w-8 h-8 rounded-full object-cover" alt="" />
                      ) : (
                        <span
                          className="flex items-center justify-center w-8 h-8 rounded-full text-lg"
                          style={{ backgroundColor: p.color }}
                        >
                          {p.avatarEmoji}
                        </span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={12} className="text-white" />
                      </span>
                    </button>
                    {isRenaming ? (
                      <>
                        <Input
                          className="h-7 text-sm flex-1"
                          key={`rename-${p.id}-${resetKeys.current.rename}`}
                          defaultValue={p.name}
                          onChange={e => { if (!composingRef.current) setRenameValue(e.target.value); }}
                          onCompositionStart={() => { composingRef.current = true; }}
                          onCompositionEnd={e => { composingRef.current = false; setRenameValue((e.target as HTMLInputElement).value); }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !composingRef.current) {
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
                  key={`persona-${resetKeys.current.persona}`}
                  defaultValue=""
                  onChange={e => { if (!composingRef.current) setNewPersonaName(e.target.value); }}
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={e => { composingRef.current = false; setNewPersonaName((e.target as HTMLInputElement).value); }}
                  onKeyDown={e => e.key === 'Enter' && handleAddPersona()}
                />
                <Button onClick={handleAddPersona} size="sm"><Plus size={14} /> 添加</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audio" className="space-y-4">
          <AudioSection
            title="任务完成音乐"
            description="学习块计时完成后随机播放"
            files={getByCategory('task_complete')}
            onAdd={(file) => addFile('task_complete', file)}
            onRemove={removeFile}
          />
          <AudioSection
            title="休息结束闹铃"
            description="休息倒计时结束后随机播放"
            files={getByCategory('rest_alarm')}
            onAdd={(file) => addFile('rest_alarm', file)}
            onRemove={removeFile}
          />
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader><CardTitle>数据备份与恢复</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                导出所有数据为 JSON 文件，可用于备份或迁移至其他设备。导入将覆盖当前所有数据。
              </p>
              <div className="flex gap-3">
                <Button onClick={handleExport} className="gap-2">
                  <Download size={16} /> 导出备份
                </Button>
                <Button onClick={handleImport} variant="outline" className="gap-2">
                  <Upload size={16} /> 导入备份
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4 border-red-200">
            <CardHeader><CardTitle className="text-red-600">危险操作</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                清空所有数据将删除所有人物、项目、知识点、学习记录等。此操作不可撤销，请先导出备份。
              </p>
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm('确定要清空所有数据吗？此操作不可撤销。\n\n建议先导出备份。')) {
                    if (window.confirm('再次确认：所有数据将被永久删除。')) {
                      db.transaction('rw', db.tables, async () => {
                        for (const table of db.tables) await table.clear();
                      }).then(() => {
                        alert('数据已清空。页面将刷新。');
                        window.location.reload();
                      });
                    }
                  }
                }}
                className="gap-2"
              >
                <Trash2 size={16} /> 清空所有数据
              </Button>
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

// ─── Audio upload section ───

function AudioSection({
  title, description, files, onAdd, onRemove,
}: {
  title: string;
  description: string;
  files: { id: string; name: string }[];
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePick = () => {
    fileRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Music size={18} className="text-brand-500" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files;
            if (!picked) return;
            for (const file of Array.from(picked)) {
              onAdd(file);
            }
          }}
        />
        {files.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <VolumeX size={24} className="mx-auto mb-2 opacity-30" />
            暂无音乐文件
          </div>
        ) : (
          files.map(f => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
              <span className="truncate flex-1">{f.name}</span>
              <button
                onClick={() => onRemove(f.id)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
        <Button onClick={handlePick} variant="outline" size="sm" className="w-full gap-2 mt-2">
          <Plus size={14} /> 添加音乐
        </Button>
      </CardContent>
    </Card>
  );
}
