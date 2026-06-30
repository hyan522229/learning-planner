import { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { StartButton } from '@/components/ui/StartButton';
import { Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { useErrorProblemStore } from '@/stores/errorProblemStore';
import { ReviewCalendar, type CalendarItem } from '@/components/knowledge/ReviewCalendar';
import { db } from '@/db';
import { formatDate } from '@/utils/date';
import type { ErrorProblem } from '@/types';

export default function ErrorProblemsPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const composingRef = useRef(false);
  const [subjectId, setSubjectId] = useState('');

  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const subjects = useSubjectStore(s => s.subjects);
  const loadSubjects = useSubjectStore(s => s.loadSubjects);
  const addError = useErrorProblemStore(s => s.addErrorProblem);
  const submitRedo = useErrorProblemStore(s => s.submitRedo);
  const deleteError = useErrorProblemStore(s => s.deleteErrorProblem);

  useEffect(() => {
    if (activePersonaId) loadSubjects(activePersonaId);
  }, [activePersonaId, loadSubjects]);

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

  const errors = useLiveQuery(
    async () => {
      if (!activePersonaId) return [];
      return db.errorProblems.where({ personaId: activePersonaId }).reverse().sortBy('createdAt');
    },
    [activePersonaId]
  ) ?? [];

  const handleAdd = async () => {
    if (!name.trim() || !activePersonaId) return;
    await addError({ personaId: activePersonaId, subjectId: subjectId || undefined, name: name.trim() });
    setName('');
    setSubjectId('');
    setShowForm(false);
  };

  const handleRedo = async (id: string, correct: boolean) => {
    await submitRedo(id, correct);
  };

  const dueCount = errors.filter(e => e.status !== 'cleared' && e.nextReviewDate <= new Date().getTime()).length;

  const calendarItems: CalendarItem[] = useMemo(() =>
    errors
      .filter(e => e.status !== 'cleared')
      .map(e => ({
        id: e.id,
        name: e.name,
        date: e.nextReviewDate,
        color: subjectMap.get(e.subjectId || '')?.color || '#e0736a',
        stageStatus: 'current' as const,
      })),
    [errors, subjectMap]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">错题管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dueCount > 0 ? `${dueCount} 道错题等待重做` : '暂无待处理的错题'}
          </p>
        </div>
        <StartButton onClick={() => setShowForm(true)} size="default">
          添加错题
        </StartButton>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">全部错题</TabsTrigger>
          <TabsTrigger value="calendar">复习日历</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <div className="space-y-2">
        <AnimatePresence>
          {errors.map((problem) => {
            const subject = subjects.find(s => s.id === problem.subjectId);
            const isDue = problem.status !== 'cleared' && problem.nextReviewDate <= Date.now();

            return (
              <motion.div
                key={problem.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border bg-card"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: subject?.color ?? '#9ca3af' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{problem.name}</span>
                    <Badge variant={
                      problem.status === 'cleared' ? 'success' :
                      problem.status === 'checking' ? 'outline' :
                      isDue ? 'warning' : 'secondary'
                    } className="text-[10px]">
                      {problem.status === 'cleared' ? '已清除' :
                       problem.status === 'checking' ? '确认中' :
                       isDue ? '待重做' : '排队中'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {subject?.name ?? '未分类'} · 已复习 {problem.reviewCount} 次
                    {problem.status !== 'cleared' && ` · 下次 ${formatDate(problem.nextReviewDate, 'MM/dd')}`}
                  </div>
                </div>

                {problem.status !== 'cleared' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleRedo(problem.id, true)} title="做对了">
                      <CheckCircle2 size={16} className="text-success-500" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRedo(problem.id, false)} title="做错了">
                      <XCircle size={16} className="text-danger-500" />
                    </Button>
                  </div>
                )}

                <button
                  onClick={() => deleteError(problem.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {errors.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-3">✏️</div>
            <p className="text-sm">还没有添加错题</p>
          </div>
        )}
          </div>
        </TabsContent>
        <TabsContent value="calendar">
          <ReviewCalendar
            items={calendarItems}
            formatLabel={(item) => item.name.replace(/^\[项目\]\s*/g, '').replace(/part/gi, '-')}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加错题</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>错题名称</Label>
              <Input
                placeholder="例如：2024真题第3题"
                key={String(showForm)}
                defaultValue={name}
                onChange={e => { if (!composingRef.current) setName(e.target.value); }}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={e => { composingRef.current = false; setName((e.target as HTMLInputElement).value); }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>所属科目（可选）</Label>
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">不指定科目</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
              <Button onClick={handleAdd}>添加</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
