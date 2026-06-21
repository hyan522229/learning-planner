import { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Dialog, DialogContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { useDueReviews } from '@/hooks/useDueReviews';
import { useSubjectStore } from '@/stores/subjectStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { formatDate } from '@/utils/date';
import { ReviewRating } from './ReviewRating';

export function ReviewQueue() {
  const dueReviews = useDueReviews();
  const subjects = useSubjectStore(s => s.subjects);
  const submitReview = useKnowledgeStore(s => s.submitReview);
  const [ratingId, setRatingId] = useState<string | null>(null);

  const ratingPoint = ratingId ? dueReviews.find(r => r.id === ratingId) : null;

  const getSubject = (subjectId: string) => subjects.find(s => s.id === subjectId);

  const handleSubmitRating = async (rating: number) => {
    if (!ratingId) return;
    await submitReview(ratingId, rating);
    setRatingId(null);
  };

  if (dueReviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>今日复习队列</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-sm">没有需要复习的知识点</p>
            <p className="text-xs mt-1">添加一些知识点开始你的艾宾浩斯复习之旅吧</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            今日复习队列
            <Badge>{dueReviews.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dueReviews.map((review, i) => {
            const subject = getSubject(review.subjectId);
            return (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card transition-all duration-150 hover:bg-muted/20 active:scale-[0.98]"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: subject?.color ?? '#9ca3af' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{review.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {subject?.name} · 阶段 R{review.currentStage + 1} · 学习于 {formatDate(review.studyDate, 'MM/dd')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setRatingId(review.id)}
                >
                  复习
                </Button>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!ratingId} onOpenChange={(v) => { if (!v) setRatingId(null); }}>
        <DialogContent className="sm:max-w-md">
          {ratingPoint && (
            <ReviewRating
              pointName={ratingPoint.name}
              onSubmit={handleSubmitRating}
              onClose={() => setRatingId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
