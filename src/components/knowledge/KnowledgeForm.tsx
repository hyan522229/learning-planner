import { useState } from 'react';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { usePersonaStore } from '@/stores/personaStore';
import { formatDate } from '@/utils/date';

interface Props {
  onClose: () => void;
}

export function KnowledgeForm({ onClose }: Props) {
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studyDate, setStudyDate] = useState(formatDate(Date.now(), 'yyyy-MM-dd'));
  const addKnowledge = useKnowledgeStore(s => s.addKnowledgePoint);
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const subjects = useSubjectStore(s => s.subjects);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subjectId || !activePersonaId) return;
    await addKnowledge({
      personaId: activePersonaId,
      subjectId: subjectId,
      name: name.trim(),
      studyDate: new Date(studyDate).getTime(),
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>添加知识点</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">知识点名称</Label>
            <Input
              id="name"
              placeholder="例如：三角函数公式推导"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">所属科目</Label>
            <select
              id="subject"
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">选择科目</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">学习日期</Label>
            <Input
              id="date"
              type="date"
              value={studyDate}
              onChange={e => setStudyDate(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>取消</Button>
          <Button type="submit">添加</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
