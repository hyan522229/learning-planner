import { useState, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/cn';
import { db } from '@/db';
import { useProjectStore } from '@/stores/projectStore';
import type { ProjectCollection, Project, MeasureType, ProjectCategory, Priority } from '@/types';
import type { CollectionProgress } from '@/engine/collection-progress';
import {
  Button,
  Badge,
  Progress,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@/components/ui';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Local constants
// ---------------------------------------------------------------------------

const MODE_LABELS: Record<ProjectCollection['mode'], string> = {
  single: '单项目',
  dual: '双项目',
  cycle: '循环',
};

const MODE_VARIANTS: Record<ProjectCollection['mode'], 'default' | 'secondary' | 'success'> = {
  single: 'default',
  dual: 'secondary',
  cycle: 'success',
};

const MEASURE_LABELS: Record<MeasureType, string> = {
  pages: '页',
  questions: '题',
  minutes: '分钟',
  words: '词',
  articles: '篇',
};

const CATEGORY_LABELS: Record<ProjectCategory, { label: string; icon: string }> = {
  study: { label: '学习', icon: '📘' },
  work: { label: '工作', icon: '💻' },
  exercise: { label: '运动', icon: '🏋️' },
};

const PRIORITY_LABELS: Record<number, string> = {
  1: '最高', 2: '较高', 3: '普通', 4: '较低', 5: '最低',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollectionCardProps {
  collection: ProjectCollection;
  projects: Project[];
  progress: CollectionProgress | null;
  onUpdate: (id: string, partial: Partial<ProjectCollection>) => void;
  onDelete: (id: string) => void;
}

// ---------------------------------------------------------------------------
// CollectionCard
// ---------------------------------------------------------------------------

export function CollectionCard({
  collection,
  projects,
  progress,
  onUpdate,
  onDelete,
}: CollectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const composingRef = useRef(false);

  // ---- Quick-create form state ----
  const [qcName, setQcName] = useState('');
  const [qcMeasureType, setQcMeasureType] = useState<MeasureType>('pages');
  const [qcCategory, setQcCategory] = useState<ProjectCategory>('study');
  const [qcTotal, setQcTotal] = useState('100');
  const [qcPriority, setQcPriority] = useState<Priority>(3);
  const [qcCreating, setQcCreating] = useState(false);

  const addProject = useProjectStore((s) => s.addProject);

  // ---- Available projects not yet in this collection ----
  const allProjects = useLiveQuery(
    async () => {
      if (!collection.personaId) return [];
      return db.projects
        .where({ personaId: collection.personaId })
        .reverse()
        .sortBy('createdAt');
    },
    [collection.personaId],
  ) ?? [];

  const availableProjects = allProjects.filter(
    (p) =>
      p.status === 'active' &&
      !collection.projectIds.includes(p.id),
  );

  // ---- Derived ----
  const completionPct = progress?.completionProgress ?? 0;

  // ---- Handlers: expand / delete ----
  const handleToggleExpand = useCallback(() => setExpanded((v) => !v), []);

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(collection.id);
  }, [confirmDelete, onDelete, collection.id]);

  const handleCancelDelete = useCallback(() => setConfirmDelete(false), []);

  // ---- Handlers: project list ----
  const handleRemoveProject = useCallback(
    (projectId: string) => {
      onUpdate(collection.id, {
        projectIds: collection.projectIds.filter((id) => id !== projectId),
      });
    },
    [collection.id, collection.projectIds, onUpdate],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const ids = [...collection.projectIds];
      [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
      onUpdate(collection.id, { projectIds: ids });
    },
    [collection.id, collection.projectIds, onUpdate],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= collection.projectIds.length - 1) return;
      const ids = [...collection.projectIds];
      [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
      onUpdate(collection.id, { projectIds: ids });
    },
    [collection.id, collection.projectIds, onUpdate],
  );

  // ---- Handlers: add-project dialog ----
  const handleOpenAddDialog = useCallback(() => {
    setQcName('');
    setQcMeasureType('pages');
    setQcCategory('study');
    setQcTotal('100');
    setQcPriority(3);
    setShowAddDialog(true);
  }, []);

  const handleCloseAddDialog = useCallback(() => {
    setShowAddDialog(false);
  }, []);

  const handleQuickCreate = useCallback(async () => {
    const trimmed = qcName.trim();
    if (!trimmed) return;
    setQcCreating(true);
    try {
      const projectId = await addProject({
        personaId: collection.personaId,
        name: trimmed,
        measureType: qcMeasureType,
        category: qcCategory,
        total: Number(qcTotal) || 100,
        completed: 0,
        priority: qcPriority,
      });
      onUpdate(collection.id, {
        projectIds: [...collection.projectIds, projectId],
      });
      setShowAddDialog(false);
    } finally {
      setQcCreating(false);
    }
  }, [
    qcName, qcMeasureType, qcCategory, qcTotal, qcPriority,
    collection.personaId, collection.id, collection.projectIds,
    addProject, onUpdate,
  ]);

  const handleAddExisting = useCallback(
    (projectId: string) => {
      onUpdate(collection.id, {
        projectIds: [...collection.projectIds, projectId],
      });
    },
    [collection.id, collection.projectIds, onUpdate],
  );

  // ---- Helpers ----
  const getProjectProgress = (p: Project): number =>
    p.total > 0 ? Math.min(100, Math.round((p.completed / p.total) * 100)) : 0;

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // =====================================================================
  // Render
  // =====================================================================

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* ---- HEADER ---- */}
      <button
        type="button"
        onClick={handleToggleExpand}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        {/* Expand arrow */}
        <span className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </span>

        {/* Name */}
        <span className="flex-1 font-semibold text-base truncate">
          {collection.name}
        </span>

        {/* Mode badge */}
        <Badge variant={MODE_VARIANTS[collection.mode] ?? 'default'}>
          {MODE_LABELS[collection.mode] ?? collection.mode}
        </Badge>

        {/* Project count */}
        <span className="text-xs text-muted-foreground shrink-0">
          {progress ? `${progress.completedCount}/${progress.totalCount}` : `${collection.projectIds.length}`}
        </span>

        {/* Delete */}
        {confirmDelete ? (
          <span className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-destructive">确认删除?</span>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              删除
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelDelete}>
              <X size={14} />
            </Button>
          </span>
        ) : (
          <span
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            title="删除合集"
          >
            <Trash2 size={15} />
          </span>
        )}
      </button>

      {/* ---- GREEN COMPLETION BAR ---- */}
      <div className="px-5 pb-1">
        <Progress value={completionPct} color="green" className="h-1.5 rounded-full" />
      </div>

      {/* ---- EXPANDABLE PROJECT LIST ---- */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="project-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-2 space-y-2">
              {/* Collection-level summary */}
              {progress && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground pb-1">
                  <span>
                    完成度 {completionPct}% · 已完成 {progress.completedCount}/{progress.totalCount} 个项目
                  </span>
                </div>
              )}

              {/* Project rows */}
              {collection.projectIds.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  暂无项目，点击下方按钮添加
                </p>
              )}

              <AnimatePresence>
                {collection.projectIds.map((pid, idx) => {
                  const project = projectMap.get(pid);
                  if (!project) return null;
                  const pct = getProjectProgress(project);
                  const cat = CATEGORY_LABELS[project.category];

                  return (
                    <motion.div
                      key={pid}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors',
                        project.status === 'completed' && 'border-green-400/30 opacity-80',
                      )}
                    >
                      {/* Reorder arrows */}
                      <div className="flex flex-col shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                          title="上移"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={idx >= collection.projectIds.length - 1}
                          onClick={() => handleMoveDown(idx)}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                          title="下移"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>

                      {/* Category icon + name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {cat && (
                            <span className="text-xs shrink-0">{cat.icon}</span>
                          )}
                          <span
                            className={cn(
                              'text-sm font-medium truncate',
                              project.status === 'completed' && 'line-through text-muted-foreground',
                            )}
                          >
                            {project.name}
                          </span>
                          {project.status === 'completed' && (
                            <Badge variant="success" className="text-[10px] shrink-0">完成</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Progress value={pct} className="h-1 flex-1" />
                          <span className="text-[11px] text-muted-foreground w-8 text-right shrink-0 tabular-nums">
                            {pct}%
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {project.measureType === 'minutes'
                            ? `${project.completed} / ${project.total} 分钟`
                            : `${project.completed} / ${project.total} ${MEASURE_LABELS[project.measureType]}`}
                          {project.currentSpeedEWMA > 0 &&
                            ` · ${project.currentSpeedEWMA} ${MEASURE_LABELS[project.measureType]}/h`}
                        </p>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(pid)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        title="从合集中移除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Add project button */}
              <button
                type="button"
                onClick={handleOpenAddDialog}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-muted-foreground/25 text-sm text-muted-foreground hover:border-brand-400/40 hover:text-brand-600 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 transition-colors"
              >
                <Plus size={16} />
                添加项目到合集
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          ADD PROJECT DIALOG
          ===================================================================== */}
      <Dialog open={showAddDialog} onOpenChange={(v) => { if (!v) handleCloseAddDialog(); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加项目到 "{collection.name}"</DialogTitle>
          </DialogHeader>

          {/* ---- Section 1: Quick Create ---- */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Sparkles size={15} />
              快速创建新项目
            </p>

            <div className="space-y-2">
              <Label>项目名称</Label>
              <Input
                placeholder="例如：数学练习册"
                value={qcName}
                onChange={(e) => {
                  if (!composingRef.current) setQcName(e.target.value);
                }}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={(e) => {
                  composingRef.current = false;
                  setQcName((e.target as HTMLInputElement).value);
                }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>项目类型</Label>
              <div className="flex gap-2">
                {(Object.keys(CATEGORY_LABELS) as ProjectCategory[]).map((key) => {
                  const cfg = CATEGORY_LABELS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setQcCategory(key)}
                      className={cn(
                        'flex-1 py-2 rounded-lg border text-sm font-medium transition-all',
                        qcCategory === key
                          ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950 dark:border-brand-700 dark:text-brand-300'
                          : 'bg-muted border-transparent text-muted-foreground hover:border-border',
                      )}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="space-y-2 flex-1">
                <Label>度量类型</Label>
                <select
                  value={qcMeasureType}
                  onChange={(e) => setQcMeasureType(e.target.value as MeasureType)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  {Object.entries(MEASURE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 w-28">
                <Label>{qcMeasureType === 'minutes' ? '总时长(分钟)' : '总量'}</Label>
                <Input
                  type="number"
                  value={qcTotal}
                  onChange={(e) => setQcTotal(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>优先级</Label>
              <div className="flex gap-1.5">
                {([1, 2, 3, 4, 5] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setQcPriority(p)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                      qcPriority === p
                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-muted border-transparent text-muted-foreground hover:border-border',
                    )}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleQuickCreate}
              disabled={!qcName.trim() || qcCreating}
              className="w-full"
            >
              {qcCreating ? '创建中...' : '创建并添加到合集'}
            </Button>
          </div>

          <Separator />

          {/* ---- Section 2: Available Projects ---- */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Search size={15} />
              添加已有项目
            </p>

            {availableProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                暂无可用项目
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1 border rounded-lg p-2">
                <AnimatePresence>
                  {availableProjects.map((p) => {
                    const cat = CATEGORY_LABELS[p.category];
                    const pct = p.total > 0
                      ? Math.min(100, Math.round((p.completed / p.total) * 100))
                      : 0;
                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        onClick={() => handleAddExisting(p.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left',
                          'hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors',
                        )}
                      >
                        {cat && <span className="text-xs shrink-0">{cat.icon}</span>}
                        <span className="flex-1 truncate font-medium">{p.name}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {p.completed}/{p.total} {MEASURE_LABELS[p.measureType]}
                        </span>
                        <span className="text-[11px] text-muted-foreground w-8 text-right shrink-0 tabular-nums">
                          {pct}%
                        </span>
                        <Plus size={14} className="text-brand-500 shrink-0" />
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleCloseAddDialog}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
