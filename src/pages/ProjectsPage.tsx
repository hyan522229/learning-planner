import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Input, Label, Progress, Badge } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { PillButton } from '@/components/ui/PillButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Plus, Trash2, Archive, ChevronUp, ChevronDown, History, Trophy, BookOpen, Sparkles, AlertTriangle, ArrowRight, Pencil, Check, X, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePersonaStore } from '@/stores/personaStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { useProjectStore } from '@/stores/projectStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { db } from '@/db';
import type { MeasureType, Priority, ProgressLog, ProjectCategory } from '@/types';
import { PRIORITY_LABELS } from '@/engine/constants';
import { formatDurationCompact } from '@/utils/time';
import { formatDate } from '@/utils/date';
import { cn } from '@/utils/cn';

const measureLabels: Record<MeasureType, string> = {
  pages: '页', questions: '题', minutes: '分钟', words: '词', articles: '篇',
};

const categoryLabels: Record<ProjectCategory, { label: string; icon: string; color: string; bgClass: string }> = {
  study: { label: '学习', icon: '📘', color: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:border-blue-800/60' },
  work: { label: '工作', icon: '💻', color: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:border-amber-800/60' },
  exercise: { label: '运动', icon: '🏋️', color: 'text-green-600 dark:text-green-400', bgClass: 'bg-green-50 border-green-200 dark:bg-green-950/60 dark:border-green-800/60' },
};

const priorityColors: Record<number, string> = {
  1: 'border-red-200 dark:border-red-800/60',
  2: 'border-orange-200 dark:border-orange-800/60',
  3: 'border-blue-200 dark:border-blue-800/60',
  4: 'border-slate-200 dark:border-slate-700/60',
  5: 'border-muted',
};

export default function ProjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const composingRef = useRef(false);
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [measureType, setMeasureType] = useState<MeasureType>('pages');
  const [category, setCategory] = useState<ProjectCategory>('study');
  const [total, setTotal] = useState('100');
  const [priority, setPriority] = useState<Priority>(3);
  const [initialProgress, setInitialProgress] = useState('0');
  const [initialSpeed, setInitialSpeed] = useState('');
  const [createReview, setCreateReview] = useState(false);
  const [dailyBlockLimit, setDailyBlockLimit] = useState('-1');

  const [updateProjectId, setUpdateProjectId] = useState<string | null>(null);
  const [updateAmount, setUpdateAmount] = useState('0');
  const [updateMinutes, setUpdateMinutes] = useState('45');
  const [logProjectId, setLogProjectId] = useState<string | null>(null);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const subjects = useSubjectStore(s => s.subjects);
  const loadSubjects = useSubjectStore(s => s.loadSubjects);
  const addProject = useProjectStore(s => s.addProject);
  const updateProgress = useProjectStore(s => s.updateProgress);
  const getProgressLogs = useProjectStore(s => s.getProgressLogs);
  const deleteProgressLog = useProjectStore(s => s.deleteProgressLog);
  const updatePriority = useProjectStore(s => s.updatePriority);
  const deleteProject = useProjectStore(s => s.deleteProject);
  const archiveProject = useProjectStore(s => s.archiveProject);
  const addKnowledgePoint = useKnowledgeStore(s => s.addKnowledgePoint);

  const [logs, setLogs] = useState<ProgressLog[]>([]);

  useEffect(() => {
    if (activePersonaId) loadSubjects(activePersonaId);
  }, [activePersonaId, loadSubjects]);

  const projects = useLiveQuery(
    async () => {
      if (!activePersonaId) return [];
      return db.projects.where({ personaId: activePersonaId }).reverse().sortBy('createdAt');
    },
    [activePersonaId]
  ) ?? [];

  const handleAdd = async () => {
    if (!name.trim() || !activePersonaId) return;
    const projectId = await addProject({
      personaId: activePersonaId,
      subjectId: subjectId || undefined,
      name: name.trim(),
      measureType,
      category,
      total: Number(total) || 100,
      completed: Number(initialProgress) || 0,
      priority,
      initialSpeed: initialSpeed ? Number(initialSpeed) : undefined,
      createReviewOnComplete: createReview && !!subjectId,
      dailyBlockLimit: Number(dailyBlockLimit),
    });

    setName(''); setMeasureType('pages'); setCategory('study'); setTotal('100'); setPriority(3);
    setSubjectId(''); setInitialProgress('0'); setInitialSpeed(''); setCreateReview(false); setDailyBlockLimit('-1');
    setShowForm(false);
  };

  const handleAddToReviewEngine = async (project: any) => {
    if (!activePersonaId) return;
    const sid = project.subjectId || subjects[0]?.id;
    if (!sid) return;
    await addKnowledgePoint({
      personaId: activePersonaId,
      subjectId: sid,
      name: project.name,
      studyDate: Date.now(),
    });
    alert('已加入复习引擎');
  };

  const handleRenameProject = async (id: string) => {
    if (!renameValue.trim()) { setRenameProjectId(null); return; }
    await db.projects.update(id, { name: renameValue.trim() });
    setRenameProjectId(null);
  };

  const handleCreateReview = async (projectId: string, projectName: string, projectSubjectId?: string) => {
    const sid = projectSubjectId || subjectId || subjects[0]?.id;
    if (!sid || !activePersonaId) return;
    await addKnowledgePoint({
      personaId: activePersonaId,
      subjectId: sid,
      name: projectName,
      studyDate: Date.now(),
    });
  };

  const handleUpdateProgress = async () => {
    if (!updateProjectId) return;
    const amount = Number(updateAmount);
    if (amount <= 0) return;
    await updateProgress(updateProjectId, amount, Number(updateMinutes) || 45);
    setUpdateProjectId(null);
  };

  const handleShowLogs = async (projectId: string) => {
    const entries = await getProgressLogs(projectId);
    setLogs(entries);
    setLogProjectId(projectId);
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteProgressLog(logId);
    if (logProjectId) {
      const entries = await getProgressLogs(logProjectId);
      setLogs(entries);
    }
  };

  const activeProjects = projects.filter(p => p.status === 'active').sort((a, b) => a.priority - b.priority);
  const completedProjects = projects.filter(p => p.status === 'completed');
  const archivedProjects = projects.filter(p => p.status === 'archived');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">学习项目</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeProjects.length} 个项目进行中</p>
        </div>
        <PillButton onClick={() => setShowForm(true)} ><Plus size={15} /> 添加项目</PillButton>
      </div>

      {/* Quick links to knowledge & errors (mobile) */}
      <div className="lg:hidden grid grid-cols-2 gap-2">
        <Link to="/knowledge" className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors active:scale-[0.98]">
          <BookOpen size={18} className="text-blue-500" />
          <span className="text-sm font-medium">知识点</span>
          <ArrowRight size={14} className="ml-auto text-muted-foreground" />
        </Link>
        <Link to="/errors" className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors active:scale-[0.98]">
          <AlertTriangle size={18} className="text-orange-500" />
          <span className="text-sm font-medium">错题</span>
          <ArrowRight size={14} className="ml-auto text-muted-foreground" />
        </Link>
      </div>

      {/* Active projects */}
      <div className="space-y-3">
        <AnimatePresence>
          {activeProjects.map(project => {
            const subject = subjects.find(s => s.id === project.subjectId);
            const progress = project.total > 0 ? Math.min(100, Math.round((project.completed / project.total) * 100)) : 0;

            return (
              <motion.div key={project.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className={cn(priorityColors[project.priority] || '', progress >= 100 && 'border-green-400/40')}>
                  <CardContent className="pt-5 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {renameProjectId === project.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                className="h-7 w-40 text-sm"
                                defaultValue={project.name}
                                onChange={e => { if (!composingRef.current) setRenameValue(e.target.value); }}
                                onCompositionStart={() => { composingRef.current = true; }}
                                onCompositionEnd={e => { composingRef.current = false; setRenameValue((e.target as HTMLInputElement).value); }}
                                onKeyDown={e => { if (e.key === 'Enter' && !composingRef.current) handleRenameProject(project.id); }}
                                autoFocus
                              />
                              <button onClick={() => handleRenameProject(project.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={14} /></button>
                              <button onClick={() => setRenameProjectId(null)} className="p-1 text-muted-foreground hover:bg-muted rounded"><X size={14} /></button>
                            </div>
                          ) : (
                            <span className="font-medium">{project.name}</span>
                          )}
                          <button
                            onClick={() => { setRenameProjectId(project.id); setRenameValue(project.name); }}
                            className="p-0.5 text-muted-foreground hover:text-foreground"
                            title="改名"
                          >
                            <Pencil size={12} />
                          </button>
                          {project.category && categoryLabels[project.category] && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <span>{categoryLabels[project.category].icon}</span>
                              {categoryLabels[project.category].label}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            优先级 {PRIORITY_LABELS[project.priority] ?? project.priority}
                          </Badge>
                          {subject && <Badge variant="secondary" className="text-[10px]">{subject.name}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.measureType === 'minutes'
                            ? `${formatDurationCompact(project.completed)} / ${formatDurationCompact(project.total)}`
                            : `${project.completed} / ${project.total} ${measureLabels[project.measureType]}`}
                          {project.currentSpeedEWMA > 0 &&
                            ` · 速度 ${project.currentSpeedEWMA} ${measureLabels[project.measureType]}/h`}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 ml-2">
                        <Button size="sm" variant="ghost"
                          onClick={() => updatePriority(project.id, Math.max(1, project.priority - 1) as Priority)}
                          title="提高优先级">
                          <ChevronUp size={14} />
                        </Button>
                        <Button size="sm" variant="ghost"
                          onClick={() => updatePriority(project.id, Math.min(5, project.priority + 1) as Priority)}
                          title="降低优先级">
                          <ChevronDown size={14} />
                        </Button>
                        <Button size="sm" variant="ghost"
                          onClick={() => { setUpdateProjectId(project.id); setUpdateAmount('0'); }}>
                          + 进度
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleAddToReviewEngine(project)} title="加入复习引擎">
                          <Brain size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleShowLogs(project.id)} title="进度记录">
                          <History size={14} />
                        </Button>
                        <button onClick={() => deleteProject(project.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <Progress value={progress} />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {activeProjects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm">还没有学习项目，点击上方按钮添加</p>
        </div>
      )}

      {/* Completed projects — trophy display */}
      {completedProjects.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-yellow-500" />
            已完成的项目
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence>
              {completedProjects.map(project => {
                const subject = subjects.find(s => s.id === project.subjectId);
                return (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  >
                    <Card className={cn(
                      'border-green-400/30 dark:border-green-500/25 overflow-hidden',
                      'bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10'
                    )}>
                      <CardContent className="pt-5 pb-3">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Trophy size={18} className="text-yellow-500 shrink-0" />
                              <span className="font-semibold">{project.name}</span>
                              {project.category && categoryLabels[project.category] && (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <span>{categoryLabels[project.category].icon}</span>
                                  {categoryLabels[project.category].label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {project.measureType === 'minutes'
                                ? `总计 ${formatDurationCompact(project.total)}`
                                : `总计 ${project.total} ${measureLabels[project.measureType]}`}
                              {project.completedAt && (
                                <span className="ml-2">· 完成于 {formatDate(project.completedAt, 'yyyy/MM/dd')}</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCreateReview(project.id, project.name, project.subjectId)}
                              title="加入艾宾浩斯复习"
                            >
                              <BookOpen size={14} className="text-brand-500" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => archiveProject(project.id)} title="归档">
                              <Archive size={14} />
                            </Button>
                            <button onClick={() => deleteProject(project.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {/* Charged progress bar */}
                        <div className="relative h-3 w-full overflow-hidden rounded-full bg-green-100 dark:bg-green-900/30">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: '100%',
                              background: 'linear-gradient(90deg, #22c55e, #16a34a, #22c55e)',
                              backgroundSize: '200% 100%',
                              animation: 'progress-charge 2s linear infinite',
                              boxShadow: '0 0 10px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                            }}
                          >
                            <div
                              className="absolute inset-0 rounded-full"
                              style={{
                                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'progress-charge 1.5s ease-in-out infinite',
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Archived projects */}
      {archivedProjects.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 mt-4">已归档</h2>
          <div className="space-y-1.5 opacity-70">
            {archivedProjects.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card text-sm">
                <Archive size={14} className="text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{p.name}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">已归档</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Project Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>添加项目</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>项目名称</Label>
              <Input placeholder="例如：数学练习册" key={String(showForm)} defaultValue={name}
                onChange={e => { if (!composingRef.current) setName(e.target.value); }}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={e => { composingRef.current = false; setName((e.target as HTMLInputElement).value); }}
                autoFocus />
            </div>
            <div className="space-y-2">
              <Label>项目类型</Label>
              <div className="flex gap-2">
                {(Object.entries(categoryLabels) as [ProjectCategory, typeof categoryLabels[ProjectCategory]][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setCategory(key)}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm font-medium transition-all',
                      category === key
                        ? cfg.bgClass + ' border-current'
                        : 'bg-muted border-transparent text-muted-foreground hover:border-border'
                    )}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>优先级 (1最高)</Label>
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as Priority[]).map(p => (
                  <button key={p} onClick={() => setPriority(p)}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                      priority === p
                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-muted border-transparent text-muted-foreground hover:border-border'
                    )}>
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>关联科目（可选）</Label>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm">
                <option value="">不关联科目</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {subjectId && (
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-brand-200 dark:border-brand-700/60 bg-brand-50/60 dark:bg-brand-950/30 cursor-pointer hover:border-brand-300 transition-colors">
                <input
                  type="checkbox"
                  checked={createReview}
                  onChange={e => setCreateReview(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium">加入艾宾浩斯复习计划</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    自动创建复习知识点，完成后定期提醒复习
                  </p>
                </div>
                <Sparkles size={16} className="text-brand-400 shrink-0" />
              </label>
            )}
            <div className="flex gap-3">
              <div className="space-y-2 flex-1">
                <Label>度量类型</Label>
                <select value={measureType} onChange={e => setMeasureType(e.target.value as MeasureType)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm">
                  {Object.entries(measureLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </div>
              <div className="space-y-2 w-28">
                <Label>{measureType === 'minutes' ? '总时长(分钟)' : '总量'}</Label>
                <Input type="number" value={total} onChange={e => setTotal(e.target.value)} min="1" />
                {measureType === 'minutes' && total && (
                  <p className="text-[10px] text-muted-foreground">≈ {formatDurationCompact(Number(total) || 0)}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="space-y-2 flex-1">
                <Label>{measureType === 'minutes' ? '初始已完成(分钟)' : '初始已完成量'}</Label>
                <Input type="number" value={initialProgress} onChange={e => setInitialProgress(e.target.value)} min="0" />
              </div>
              <div className="space-y-2 w-32">
                <Label>预估速度(/h)</Label>
                <Input
                  type="number"
                  value={initialSpeed}
                  onChange={e => setInitialSpeed(e.target.value)}
                  min="0"
                  step="0.1"
                  placeholder="如 12"
                />
                <p className="text-[10px] text-muted-foreground">可选，帮助计划排期</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>建议每日学习块</Label>
              <Input
                type="number"
                value={dailyBlockLimit}
                onChange={e => setDailyBlockLimit(e.target.value)}
                min="-1"
                max="20"
                placeholder="-1 = 无建议"
              />
              <p className="text-[10px] text-muted-foreground">仅供参考，实际排块不受此限制。0=暂不自动安排</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
              <Button onClick={handleAdd}>添加</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Progress Dialog */}
      <Dialog open={!!updateProjectId} onOpenChange={(v) => { if (!v) setUpdateProjectId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>更新进度</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>完成了多少？</Label>
              <Input type="number" value={updateAmount} onChange={e => setUpdateAmount(e.target.value)} min="0" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>花了多长时间（分钟）</Label>
              <Input type="number" value={updateMinutes} onChange={e => setUpdateMinutes(e.target.value)} min="1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUpdateProjectId(null)}>取消</Button>
              <Button onClick={handleUpdateProgress}>确认更新</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Logs Dialog */}
      <Dialog open={!!logProjectId} onOpenChange={(v) => { if (!v) setLogProjectId(null); }}>
        <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>进度记录</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无进度记录</p>
            ) : (
              <AnimatePresence>
                {logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card text-sm"
                  >
                    <div>
                      <span className="font-medium">+{log.amount}</span>
                      <span className="text-muted-foreground ml-2">
                        耗时 {formatDurationCompact(log.durationMinutes)}
                      </span>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(log.date, 'yyyy-MM-dd HH:mm')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                      title="删除此记录"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Project Collections ── */}
      <CollectionsSection personaId={activePersonaId ?? undefined} projects={activeProjects} />
    </div>
  );
}

// ─── Collections Section ───

function CollectionsSection({ personaId, projects }: { personaId?: string; projects: any[] }) {
  const [showForm, setShowForm] = useState(false);
  const [colName, setColName] = useState('');
  const [colMode, setColMode] = useState<'single' | 'dual'>('single');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const composingRef = useRef(false);
  const addCol = useCollectionStore(s => s.addCollection);
  const deleteCol = useCollectionStore(s => s.deleteCollection);
  const updateCol = useCollectionStore(s => s.updateCollection);

  const collections = useLiveQuery(async () => {
    if (!personaId) return [];
    return db.projectCollections.where({ personaId }).toArray();
  }, [personaId]) ?? [];

  const handleAdd = async () => {
    if (!colName.trim() || !personaId || selectedIds.length === 0) return;
    await addCol({ personaId, name: colName.trim(), projectIds: selectedIds, mode: colMode });
    setColName(''); setSelectedIds([]); setColMode('single'); setShowForm(false);
  };

  const toggleProject = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const projectMap = new Map(projects.map(p => [p.id, p]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">项目合集</h2>
          <p className="text-sm text-muted-foreground">{collections.length} 个合集</p>
        </div>
        <PillButton onClick={() => setShowForm(true)} ><Plus size={15} /> 添加合集</PillButton>
      </div>

      <div className="space-y-3">
        {collections.map(col => {
          const colProjects = col.projectIds.map(id => projectMap.get(id)).filter(Boolean);
          const completed = colProjects.filter((p: any) => p.status === 'completed').length;
          const pct = colProjects.length > 0 ? Math.round((completed / colProjects.length) * 100) : 0;

          return (
            <Card key={col.id}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{col.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {col.mode === 'single' ? '单项目' : '双项目'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateCol(col.id, { mode: col.mode === 'single' ? 'dual' : 'single' })}
                      className="px-2 py-0.5 text-xs rounded border hover:bg-muted transition-colors"
                    >
                      切换为{col.mode === 'single' ? '双' : '单'}项目
                    </button>
                    <button onClick={() => deleteCol(col.id)} className="p-1 text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <Progress value={pct} className="h-2 mb-2" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{completed}/{colProjects.length} 完成</span>
                  <span>·</span>
                  <span>{pct}%</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {colProjects.map((p: any, i: number) => (
                    <span
                      key={p.id}
                      className={cn(
                        'text-[11px] px-2 py-0.5 rounded-full',
                        p.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        i === 0 && col.mode === 'single' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        (i === 0 || i === 1) && col.mode === 'dual' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-muted text-muted-foreground',
                      )}
                    >
                      {p.name}
                      {p.status === 'completed' && ' ✓'}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>新建项目合集</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>合集名称</Label>
              <Input
                key={String(showForm)}
                defaultValue=""
                onChange={e => { if (!composingRef.current) setColName(e.target.value); }}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={e => { composingRef.current = false; setColName((e.target as HTMLInputElement).value); }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>项目模式</Label>
              <div className="flex gap-2">
                {(['single', 'dual'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setColMode(m)}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm transition-all',
                      colMode === m
                        ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950 dark:border-brand-700 dark:text-brand-300'
                        : 'border-input text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {m === 'single' ? '单项目进行' : '双项目同时'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>选择项目（按顺序）</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                {projects.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleProject(p.id)}
                      className="rounded"
                    />
                    {p.name}
                    {p.status === 'completed' && <span className="text-green-500 text-xs">✓</span>}
                  </label>
                ))}
                {projects.length === 0 && <p className="text-xs text-muted-foreground py-2">暂无可选项目</p>}
              </div>
            </div>
            {selectedIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                已选 {selectedIds.length} 个项目，按选择顺序排列
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
              <Button onClick={handleAdd} disabled={!colName.trim() || selectedIds.length === 0}>创建合集</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
