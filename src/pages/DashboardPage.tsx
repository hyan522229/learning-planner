import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@/components/ui';
import { BookOpen, CheckCircle2, AlertTriangle, TrendingUp, ArrowRight, Play, Plus, Timer, FolderKanban, ChevronRight } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import { useTimerStore } from '@/stores/timerStore';
import { useSound } from '@/hooks/useSound';
import { db } from '@/db';
import { startOfDayEpoch } from '@/utils/date';
import { formatDurationCompact } from '@/utils/time';
import type { Project } from '@/types';

const categoryIcons: Record<string, string> = { study: '📚', work: '💼', exercise: '🏃' };

export default function DashboardPage() {
  const navigate = useNavigate();
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const startTimer = useTimerStore(s => s.start);
  const { play } = useSound();

  const dueReviews = useLiveQuery(async () => {
    if (!activePersonaId) return [];
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return db.knowledgePoints
      .where({ personaId: activePersonaId, status: 'active' })
      .filter(kp => kp.nextReviewDate <= todayEnd.getTime())
      .toArray();
  }, [activePersonaId]) ?? [];

  const dueErrors = useLiveQuery(async () => {
    if (!activePersonaId) return [];
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return db.errorProblems
      .where({ personaId: activePersonaId })
      .filter(e => e.status !== 'cleared' && e.nextReviewDate <= todayEnd.getTime())
      .toArray();
  }, [activePersonaId]) ?? [];

  const todayBlocks = useLiveQuery(async () => {
    if (!activePersonaId) return [];
    const today = startOfDayEpoch();
    return db.blocks.where({ personaId: activePersonaId, date: today }).toArray();
  }, [activePersonaId]) ?? [];

  const completedBlocks = todayBlocks.filter(b => b.status === 'completed').length;
  const scheduledBlocks = todayBlocks.filter(b => b.status === 'scheduled' || b.status === 'in_progress');

  const totalKnowledge = useLiveQuery(async () => {
    if (!activePersonaId) return 0;
    return db.knowledgePoints.where({ personaId: activePersonaId }).count();
  }, [activePersonaId]) ?? 0;

  const activeProjects = useLiveQuery(async () => {
    if (!activePersonaId) return [];
    return db.projects.where({ personaId: activePersonaId, status: 'active' }).toArray();
  }, [activePersonaId]) ?? [];

  const handleQuickTimer = () => {
    play('timer-start');
    startTimer('quick-' + Date.now(), 45);
    navigate('/timer');
  };

  const quickActions = [
    { label: '快速计时', icon: Timer, onClick: handleQuickTimer, color: 'text-brand-500' },
    { label: '添加知识点', icon: Plus, to: '/knowledge', color: 'text-success-500' },
    { label: '新建项目', icon: FolderKanban, to: '/projects', color: 'text-warning-500' },
    { label: '查看规划', icon: ArrowRight, to: '/plan', color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">今日概览</h1>
        <div className="flex gap-2">
          {quickActions.map(action => (
            action.onClick ? (
              <Button key={action.label} size="sm" variant="outline" onClick={action.onClick} className="gap-1.5">
                <action.icon size={16} className={action.color} /> {action.label}
              </Button>
            ) : (
              <Button key={action.label} size="sm" variant="outline" asChild className="gap-1.5">
                <Link to={action.to!}>
                  <action.icon size={16} className={action.color} /> {action.label}
                </Link>
              </Button>
            )
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">待复习</CardTitle>
            <BookOpen size={18} className="text-brand-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dueReviews.length}</div>
            <p className="text-xs text-muted-foreground mt-1">个知识点等待复习</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已完成的块</CardTitle>
            <CheckCircle2 size={18} className="text-success-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedBlocks}</div>
            <p className="text-xs text-muted-foreground mt-1">个学习块已完成</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">待处理错题</CardTitle>
            <AlertTriangle size={18} className="text-warning-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dueErrors.length}</div>
            <p className="text-xs text-muted-foreground mt-1">道错题待重做</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">知识点总数</CardTitle>
            <TrendingUp size={18} className="text-success-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalKnowledge}</div>
            <p className="text-xs text-muted-foreground mt-1">个知识点已录入</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Timeline Preview + Must-Do Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Must-Do & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>今日必做</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/plan" className="gap-1">
                  查看规划 <ArrowRight size={14} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {dueReviews.length === 0 && dueErrors.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-sm">今天没有必须完成的任务</p>
                  <p className="text-xs mt-1">去<Link to="/knowledge" className="text-brand-500 hover:underline">添加知识点</Link>开始学习吧</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dueReviews.length > 0 && (
                    <Link to="/knowledge" className="flex items-center justify-between p-3 rounded-lg bg-brand-50 dark:bg-brand-950 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-brand-500" />
                        <span className="text-sm">待复习知识点</span>
                      </div>
                      <span className="font-bold text-brand-600">{dueReviews.length} 个</span>
                    </Link>
                  )}
                  {dueErrors.length > 0 && (
                    <Link to="/errors" className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-orange-500" />
                        <span className="text-sm">待重做错题</span>
                      </div>
                      <span className="font-bold text-orange-500">{dueErrors.length} 道</span>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          {scheduledBlocks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  今日时间线
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {completedBlocks}/{todayBlocks.length} 已完成
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scheduledBlocks.map(block => (
                  <button
                    key={block.id}
                    onClick={() => {
                      startTimer(block.id, block.estimatedDurationMinutes);
                      navigate('/timer');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-all text-left group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: block.type === 'review' ? '#22c55e'
                          : block.type === 'error_problem' ? '#f97316'
                          : block.type === 'exercise' ? '#a855f7'
                          : '#3b82f6'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{block.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {block.timeSlotStart} - {block.timeSlotEnd} · {block.estimatedDurationMinutes}分钟
                      </p>
                    </div>
                    <Play size={14} className="text-muted-foreground/30 group-hover:text-brand-500 transition-colors shrink-0" />
                  </button>
                ))}
                {completedBlocks > 0 && (
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    已完成 {completedBlocks} 个块，继续保持！
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Active Projects Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">进行中的项目</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link to="/projects" className="gap-1">
                  全部 <ChevronRight size={12} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeProjects.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <div className="text-2xl mb-1">📂</div>
                  <p className="text-xs">暂无项目</p>
                  <Link to="/projects" className="text-xs text-brand-500 hover:underline">去添加</Link>
                </div>
              ) : (
                activeProjects.slice(0, 5).map(project => {
                  const progress = project.total > 0 ? Math.min(100, Math.round((project.completed / project.total) * 100)) : 0;
                  return (
                    <Link
                      key={project.id}
                      to="/projects"
                      className="block p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium flex items-center gap-1.5">
                          {project.category && categoryIcons[project.category]}
                          <span className="truncate max-w-[120px]">{project.name}</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">今日产出</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold">{completedBlocks}</div>
                  <div className="text-[10px] text-muted-foreground">完成块</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold">{dueReviews.length}</div>
                  <div className="text-[10px] text-muted-foreground">待复习</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold">{dueErrors.length}</div>
                  <div className="text-[10px] text-muted-foreground">待错题</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold">{activeProjects.length}</div>
                  <div className="text-[10px] text-muted-foreground">活跃项目</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
