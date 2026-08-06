import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { StartButton } from '@/components/ui/StartButton';
import { Dialog, DialogContent } from '@/components/ui';
import { Plus } from 'lucide-react';
import { KnowledgeList } from '@/components/knowledge/KnowledgeList';
import { ReviewQueue } from '@/components/knowledge/ReviewQueue';
import { KnowledgeForm } from '@/components/knowledge/KnowledgeForm';
import { ReviewCalendar, type CalendarItem } from '@/components/knowledge/ReviewCalendar';
import { usePersonaStore } from '@/stores/personaStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { db } from '@/db';
import { calculateReviewDates, projectedStageDate } from '@/engine/ebbinghaus';

export default function KnowledgePage() {
  const [showForm, setShowForm] = useState(false);
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const loadSubjects = useSubjectStore(s => s.loadSubjects);
  const subjects = useSubjectStore(s => s.subjects);

  useEffect(() => {
    if (activePersonaId) {
      loadSubjects(activePersonaId);
    }
  }, [activePersonaId, loadSubjects]);

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

  const knowledgePoints = useLiveQuery(
    async () => {
      if (!activePersonaId) return [];
      // Include ALL knowledge points — active, completed, paused
      return db.knowledgePoints
        .where({ personaId: activePersonaId })
        .toArray();
    },
    [activePersonaId]
  ) ?? [];

  // Calendar entries: for each stage, compute the correct display date.
  // Past stages (i < currentStage): theoretical date (original plan).
  // Current stage (i === currentStage): nextReviewDate (actual pending).
  // Future stages (i > currentStage): projected from nextReviewDate.
  const calendarItems: CalendarItem[] = useMemo(() => {
    const items: CalendarItem[] = [];
    for (const kp of knowledgePoints) {
      const color = subjectMap.get(kp.subjectId)?.color || '#0066cc';
      const enabled = kp.enabledStages || Array.from({ length: 10 }, () => true);
      for (let i = 0; i < 10; i++) {
        if (!enabled[i]) continue;
        const stageStatus: CalendarItem['stageStatus'] =
          i < kp.currentStage ? 'past' :
          i === kp.currentStage ? 'current' : 'future';
        items.push({
          id: `${kp.id}-r${i}`,
          name: kp.name,
          date: projectedStageDate(kp, i),
          color,
          stage: i,
          stageStatus,
        });
      }
    }
    return items;
  }, [knowledgePoints, subjectMap]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">知识点管理</h1>
        <StartButton onClick={() => setShowForm(true)} size="default">
          添加知识点
        </StartButton>
      </div>

      <Tabs defaultValue="review">
        <TabsList>
          <TabsTrigger value="review">今日复习</TabsTrigger>
          <TabsTrigger value="calendar">复习日历</TabsTrigger>
          <TabsTrigger value="all">全部知识点</TabsTrigger>
        </TabsList>
        <TabsContent value="review">
          <ReviewQueue />
        </TabsContent>
        <TabsContent value="calendar">
          <ReviewCalendar
            items={calendarItems}
            formatLabel={(item) => {
              const name = item.name.replace(/^\[项目\]\s*/g, '').replace(/part/gi, '-');
              return `R${(item.stage ?? 0) + 1} ${name}`;
            }}
          />
        </TabsContent>
        <TabsContent value="all">
          <KnowledgeList />
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <KnowledgeForm onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
