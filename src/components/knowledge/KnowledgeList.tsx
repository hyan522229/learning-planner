import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useAllKnowledge } from '@/hooks/useAllKnowledge';
import { useSubjectStore } from '@/stores/subjectStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { KnowledgeCard } from './KnowledgeCard';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { usePersonaStore } from '@/stores/personaStore';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export function KnowledgeList() {
  const points = useAllKnowledge();
  const subjects = useSubjectStore(s => s.subjects);
  const deletePoint = useKnowledgeStore(s => s.deleteKnowledgePoint);
  const updateKnowledgePoint = useKnowledgeStore(s => s.updateKnowledgePoint);
  const activePersonaId = usePersonaStore(s => s.activePersonaId);

  const collections = useLiveQuery(
    async () => {
      if (!activePersonaId) return [];
      return db.projectCollections.where({ personaId: activePersonaId }).toArray();
    },
    [activePersonaId]
  ) ?? [];

  const [moveKpId, setMoveKpId] = useState<string | null>(null);
  const [moveTargetGroup, setMoveTargetGroup] = useState<string>('');

  const getSubject = (subjectId: string) => subjects.find(s => s.id === subjectId);

  // Group KPs: those with knowledgeGroupId go under their collection;
  // those without go under "未分组"
  const { groups, ungrouped } = useMemo(() => {
    const colMap = new Map(collections.map(c => [c.id, c]));
    const grouped = new Map<string, { collection: typeof collections[0]; points: typeof points }>();
    const ungroupedList: typeof points = [];

    for (const kp of points) {
      if (kp.knowledgeGroupId && colMap.has(kp.knowledgeGroupId)) {
        const col = colMap.get(kp.knowledgeGroupId)!;
        if (!grouped.has(col.id)) grouped.set(col.id, { collection: col, points: [] });
        grouped.get(col.id)!.points.push(kp);
      } else {
        ungroupedList.push(kp);
      }
    }

    return { groups: Array.from(grouped.values()), ungrouped: ungroupedList };
  }, [points, collections]);

  // Collections that can be used as groups (all collections for this persona)
  const availableGroups = useMemo(() => {
    return collections.map(c => ({ id: c.id, name: c.name }));
  }, [collections]);

  const handleMoveKp = async () => {
    if (!moveKpId) return;
    await updateKnowledgePoint(moveKpId, {
      knowledgeGroupId: moveTargetGroup || undefined,
    });
    setMoveKpId(null);
    setMoveTargetGroup('');
  };

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
    <div className="space-y-4">
      {/* Grouped sections */}
      {groups.map(({ collection, points: groupPoints }) => (
        <GroupSection
          key={collection.id}
          title={collection.name}
          count={groupPoints.length}
          defaultOpen={true}
        >
          <AnimatePresence>
            {groupPoints.map(kp => {
              const subject = getSubject(kp.subjectId);
              return (
                <KnowledgeCard
                  key={kp.id}
                  point={kp}
                  subjectName={subject?.name ?? '未知科目'}
                  subjectColor={subject?.color ?? '#9ca3af'}
                  onDelete={deletePoint}
                  onMoveToGroup={() => setMoveKpId(kp.id)}
                />
              );
            })}
          </AnimatePresence>
        </GroupSection>
      ))}

      {/* Ungrouped section */}
      {ungrouped.length > 0 && (
        <GroupSection
          title="未分组"
          count={ungrouped.length}
          defaultOpen={true}
          muted
        >
          <AnimatePresence>
            {ungrouped.map(kp => {
              const subject = getSubject(kp.subjectId);
              return (
                <KnowledgeCard
                  key={kp.id}
                  point={kp}
                  subjectName={subject?.name ?? '未知科目'}
                  subjectColor={subject?.color ?? '#9ca3af'}
                  onDelete={deletePoint}
                  onMoveToGroup={() => setMoveKpId(kp.id)}
                />
              );
            })}
          </AnimatePresence>
        </GroupSection>
      )}

      {/* Move to group dialog */}
      <Dialog open={!!moveKpId} onOpenChange={(v) => { if (!v) setMoveKpId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>移动到合集</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            将知识点归类到合集下显示（不影响复习计划）。
          </p>
          <select
            value={moveTargetGroup}
            onChange={e => setMoveTargetGroup(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">移除分组（独立显示）</option>
            {availableGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveKpId(null)}>取消</Button>
            <Button onClick={handleMoveKp}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Collapsible section for a group of knowledge points */
function GroupSection({
  title,
  count,
  defaultOpen,
  muted,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className="rounded-xl border bg-card">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', muted && 'text-muted-foreground')}>
            {title}
          </span>
          <Badge variant="secondary" className="text-[10px]">{count}</Badge>
        </div>
        <ChevronDown size={16} className={cn('transition-transform text-muted-foreground', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}
