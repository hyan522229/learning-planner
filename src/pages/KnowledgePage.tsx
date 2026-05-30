import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Dialog, DialogContent } from '@/components/ui';
import { Plus } from 'lucide-react';
import { KnowledgeList } from '@/components/knowledge/KnowledgeList';
import { ReviewQueue } from '@/components/knowledge/ReviewQueue';
import { KnowledgeForm } from '@/components/knowledge/KnowledgeForm';
import { usePersonaStore } from '@/stores/personaStore';
import { useSubjectStore } from '@/stores/subjectStore';

export default function KnowledgePage() {
  const [showForm, setShowForm] = useState(false);
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const loadSubjects = useSubjectStore(s => s.loadSubjects);

  useEffect(() => {
    if (activePersonaId) {
      loadSubjects(activePersonaId);
    }
  }, [activePersonaId, loadSubjects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">知识点管理</h1>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus size={16} />
          添加知识点
        </Button>
      </div>

      <Tabs defaultValue="review">
        <TabsList>
          <TabsTrigger value="review">今日复习</TabsTrigger>
          <TabsTrigger value="all">全部知识点</TabsTrigger>
        </TabsList>
        <TabsContent value="review">
          <ReviewQueue />
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
