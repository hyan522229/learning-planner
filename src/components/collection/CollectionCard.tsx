import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/cn';
import type { ProjectCollection, Project } from '@/types';
import type { CollectionProgress } from '@/engine/collection-progress';
import { Card, CardContent, Progress, Badge, Button } from '@/components/ui';
import {
  ChevronDown,
  Trash2,
  RefreshCw,
  Plus,
  X,
  Brain,
  ChevronUp,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollectionCardProps {
  collection: ProjectCollection;
  projects: Project[];
  progress: CollectionProgress | null;
  allProjects?: Project[];
  onAddProjects?: (ids: string[]) => void;
  onRemoveProject?: (id: string) => void;
  onMoveProject?: (id: string, dir: 'up' | 'down') => void;
  onCreateProjectFull?: () => void;
  onProjectProgress?: (id: string) => void;
  onProjectReview?: (p: Project) => void;
  onProjectDelete?: (id: string) => void;
  onDelete?: () => void;
  onRestartCycle?: () => void;
  onUpdate?: (id: string, partial: any) => void;
}

// ---------------------------------------------------------------------------
// CollectionCard
// ---------------------------------------------------------------------------

export function CollectionCard({
  collection,
  projects,
  progress,
  onRemoveProject,
  onMoveProject,
  onCreateProjectFull,
  onProjectProgress,
  onProjectReview,
  onProjectDelete,
  onDelete,
  onRestartCycle,
}: CollectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ---- Derived ----
  const completionPct = progress?.completionProgress ?? 0;
  const completedCount = progress?.completedCount ?? 0;
  const totalCount = progress?.totalCount ?? 0;
  const completedUnits = progress?.completedUnits ?? 0;
  const totalUnits = progress?.totalUnits ?? 0;

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const getProjectProgress = (p: Project): number =>
    p.total > 0 ? Math.min(100, Math.round((p.completed / p.total) * 100)) : 0;

  // ---- Handlers ----
  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete?.();
  };

  const handleCancelDelete = () => setConfirmDelete(false);


  // =====================================================================
  // Render
  // =====================================================================

  return (
    <Card>
      <CardContent className="pt-5 pb-3">
        {/* ---- Header row (matches project card layout) ---- */}
        <div className="flex items-start justify-between mb-2">
          {/* Left: name, badges, stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{collection.name}</span>
              <Badge
                variant={MODE_VARIANTS[collection.mode] ?? 'default'}
                className="text-[10px]"
              >
                {MODE_LABELS[collection.mode] ?? collection.mode}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalCount} 项目完成
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedUnits} / {totalUnits} · 总进度 {completionPct}%
            </p>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            {collection.mode === 'cycle' && onRestartCycle && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRestartCycle}
                title="重启循环"
              >
                <RefreshCw size={14} />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? '收起' : '展开'}
            >
              <ChevronDown
                size={16}
                className={cn('transition-transform', expanded && 'rotate-180')}
              />
            </Button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-destructive">确认?</span>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                  删除
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelDelete}
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                title="删除合集"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>

        {/* ---- Progress bar (same as project cards) ---- */}
        <Progress value={completionPct} />

        {/* ---- Expandable project list ---- */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t space-y-2">
                {/* Empty state */}
                {collection.projectIds.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    暂无项目，点击下方按钮添加
                  </p>
                )}

                {/* Project mini-cards */}
                <AnimatePresence>
                  {collection.projectIds.map((pid, idx) => {
                    const project = projectMap.get(pid);
                    if (!project) return null;

                    const pct = getProjectProgress(project);

                    return (
                      <motion.div
                        key={pid}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="group rounded-lg border bg-muted/30 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between">
                          {/* Left: project info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium truncate">
                                {project.name}
                              </span>
                              {project.category && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {project.category}
                                </Badge>
                              )}
                              {project.subjectId && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {project.subjectId}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {project.completed} / {project.total} · {pct}%
                            </p>
                            <Progress value={pct} className="h-1.5 mt-1" />
                          </div>

                          {/* Right: action buttons */}
                          <div className="flex items-center gap-0.5 shrink-0 ml-2">
                            {/* Reorder arrows (visible on hover) */}
                            {onMoveProject && (
                              <div className="flex-col hidden group-hover:flex">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => onMoveProject(pid, 'up')}
                                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                                  title="上移"
                                >
                                  <ChevronUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    idx >= collection.projectIds.length - 1
                                  }
                                  onClick={() => onMoveProject(pid, 'down')}
                                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                                  title="下移"
                                >
                                  <ChevronDown size={13} />
                                </button>
                              </div>
                            )}
                            {onProjectProgress && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onProjectProgress(pid)}
                              >
                                + 进度
                              </Button>
                            )}
                            {onProjectReview && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onProjectReview(project)}
                                title="加入复习引擎"
                              >
                                <Brain size={14} />
                              </Button>
                            )}
                            {onRemoveProject && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onRemoveProject(pid)}
                                title="从合集中移除"
                              >
                                <X size={14} />
                              </Button>
                            )}
                            {onProjectDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onProjectDelete(pid)}
                                title="删除项目"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Add project button */}
                {onCreateProjectFull && (
                  <button
                    type="button"
                    onClick={onCreateProjectFull}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-muted-foreground/25 text-sm text-muted-foreground hover:border-brand-400/40 hover:text-brand-600 transition-colors"
                  >
                    <Plus size={16} />
                    添加项目
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
