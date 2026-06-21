import { AnimatePresence } from 'motion/react';
import { useAllKnowledge } from '@/hooks/useAllKnowledge';
import { useSubjectStore } from '@/stores/subjectStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { KnowledgeCard } from './KnowledgeCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export function KnowledgeList() {
  const points = useAllKnowledge();
  const subjects = useSubjectStore(s => s.subjects);
  const deletePoint = useKnowledgeStore(s => s.deleteKnowledgePoint);

  const getSubject = (subjectId: string) => subjects.find(s => s.id === subjectId);

  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>全部知识点</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-3">📖</div>
            <p className="text-sm">还没有添加任何知识点</p>
            <p className="text-xs mt-1">点击右上角的"添加知识点"开始记录</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {points.map(point => {
          const subject = getSubject(point.subjectId);
          return (
            <KnowledgeCard
              key={point.id}
              point={point}
              subjectName={subject?.name ?? '未知科目'}
              subjectColor={subject?.color ?? '#9ca3af'}
              onDelete={deletePoint}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
