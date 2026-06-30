import { useState, useRef } from 'react';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { ReviewPlanDialog } from './ReviewPlanDialog';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { usePersonaStore } from '@/stores/personaStore';
import { formatDate } from '@/utils/date';

interface Props {
  onClose: () => void;
}

export function KnowledgeForm({ onClose }: Props) {
  const [name, setName] = useState('');
  const composingRef = useRef(false);
  const [subjectId, setSubjectId] = useState('');
  const [studyDate, setStudyDate] = useState(formatDate(Date.now(), 'yyyy-MM-dd'));
  const [reviewDuration, setReviewDuration] = useState(10);
  const [initialStage, setInitialStage] = useState(0);
  const [showPlan, setShowPlan] = useState(false);
  const addKnowledge = useKnowledgeStore(s => s.addKnowledgePoint);
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const subjects = useSubjectStore(s => s.subjects);

  const handleSubmit = async () => {
    if (!name.trim() || !subjectId || !activePersonaId) return;
    await addKnowledge({
      personaId: activePersonaId,
      subjectId: subjectId,
      name: name.trim(),
      studyDate: new Date(studyDate).getTime(),
      reviewDurationMinutes: reviewDuration,
      initialStage,
    });
    onClose();
  };

  return (
    <div>
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
              key="kn-form"
              defaultValue={name}
              onChange={e => { if (!composingRef.current) setName(e.target.value); }}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={e => { composingRef.current = false; setName((e.target as HTMLInputElement).value); }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">所属科目</Label>
            <select
              id="subject"
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          <div className="space-y-2">
            <Label htmlFor="stage">已完成的复习阶段</Label>
            <select
              id="stage"
              value={initialStage}
              onChange={e => setInitialStage(Number(e.target.value))}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value={0}>未开始复习</option>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>已完成 R{i + 1}{i + 1 === 10 ? '（全部完成）' : ''}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">已完成的艾宾浩斯复习阶段，计划将从下一阶段开始安排</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">单次复习时长（分钟）</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={120}
              value={reviewDuration}
              onChange={e => setReviewDuration(Number(e.target.value))}
            />
            <p className="text-[11px] text-muted-foreground">后续可在知识点详情中调整</p>
          </div>
          <div className="space-y-2">
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setShowPlan(true)}>
              设置复习计划
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit}>添加</Button>
        </CardFooter>
      </Card>
      <ReviewPlanDialog
        open={showPlan}
        onClose={() => setShowPlan(false)}
        defaultStage={initialStage}
        defaultDuration={reviewDuration}
        onSave={(data) => {
          setInitialStage(data.initialStage);
          setReviewDuration(data.reviewDurationMinutes);
          setShowPlan(false);
        }}
      />
    </div>
  );
}
