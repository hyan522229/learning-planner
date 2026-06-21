import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { usePersonaStore } from '@/stores/personaStore';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { startOfDayEpoch } from '@/utils/date';

const measureLabels: Record<string, string> = {
  pages: '页', questions: '题', minutes: '分钟', words: '词', articles: '篇',
};

export default function ProgressPage() {
  const activePersonaId = usePersonaStore(s => s.activePersonaId);

  const projects = useLiveQuery(async () => {
    if (!activePersonaId) return [];
    return db.projects.where({ personaId: activePersonaId }).toArray();
  }, [activePersonaId]) ?? [];

  const activeProjects = projects.filter(p => p.status === 'active').sort((a, b) => a.priority - b.priority);
  const completedProjects = projects.filter(p => p.status === 'completed');

  const today = startOfDayEpoch();
  const weekDays: { label: string; date: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today - i * 86400000);
    weekDays.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, date: today - i * 86400000 });
  }

  const weekBlocks = useLiveQuery(async () => {
    if (!activePersonaId) return [];
    const weekStart = today - 6 * 86400000;
    const weekEnd = today + 86399999;
    return db.blocks
      .where({ personaId: activePersonaId })
      .filter(b => b.date >= weekStart && b.date <= weekEnd && b.status === 'completed')
      .toArray();
  }, [activePersonaId]) ?? [];

  const totalCompletedBlocks = weekBlocks.length;
  const totalReviewed = weekBlocks.filter(b => b.type === 'review').length;
  const totalErrors = weekBlocks.filter(b => b.type === 'error_problem').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">进度总览</h1>
        <p className="text-xs text-gray-400 mt-0.5">本周产出</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{totalCompletedBlocks}</div>
            <div className="text-[10px] text-gray-400">完成学习块</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{totalReviewed}</div>
            <div className="text-[10px] text-gray-400">复习知识点</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">{totalErrors}</div>
            <div className="text-[10px] text-gray-400">消灭错题</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">本周热力图</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-1 justify-between">
            {weekDays.map((day) => {
              const dayBlocks = weekBlocks.filter(b => b.date === day.date);
              const intensity = Math.min(dayBlocks.length, 8);
              const opacity = intensity / 8;
              return (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-md transition-colors"
                    style={{ backgroundColor: `rgba(99, 102, 241, ${Math.max(0.05, opacity)})` }}
                    title={`${dayBlocks.length} 个完成`}
                  />
                  <span className="text-[9px] text-gray-400">{day.label.split('/')[1]}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">学习项目进度</h2>
        <div className="space-y-3">
          {activeProjects.map(project => {
            const pct = project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-lg border bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{project.name}</span>
                  <span className="text-xs text-gray-400">
                    {project.completed}/{project.total} {measureLabels[project.measureType] ?? ''}
                    <span className="ml-1">({pct}%)</span>
                  </span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full animate-progress-charge"
                    style={{
                      background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                      backgroundSize: '200% 100%',
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {completedProjects.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">已完成</h2>
          <div className="space-y-1">
            {completedProjects.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 line-through">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
