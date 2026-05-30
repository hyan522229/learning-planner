import type { TimeSlotTemplate, Subject } from '@/types';
import { timeStringToMinutes, minutesToTimeString } from '@/utils/date';

export interface SlotAssignment {
  slotTemplateId: string;
  subjectId: string | null;
  blockType: 'new_learning';
  duration: 30 | 45;
}

export function allocateSlots(
  slots: TimeSlotTemplate[],
  subjects: Subject[],
  settings: { sameSubjectMinGapMinutes: number },
  subjectDailyTotals: Map<string, number>,
  subjectLastEnd: Map<string, string>,
  budgetMinutes: number
): SlotAssignment[] {
  const assignments: SlotAssignment[] = [];
  let remainingBudget = budgetMinutes;

  // Only schedule in slots that allow new_learning
  const learnSlots = slots.filter(s => s.allowedBlockTypes.includes('new_learning'));

  for (const slot of learnSlots) {
    if (remainingBudget <= 0) break;

    const duration = slot.defaultDuration;
    if (duration > remainingBudget) continue;

    const candidate = findBestSubject(
      slot, subjects, settings, subjectDailyTotals, subjectLastEnd
    );

    if (candidate) {
      assignments.push({
        slotTemplateId: slot.id,
        subjectId: candidate.id,
        blockType: 'new_learning',
        duration,
      });
      subjectDailyTotals.set(
        candidate.id,
        (subjectDailyTotals.get(candidate.id) || 0) + duration
      );
      subjectLastEnd.set(candidate.id, slot.endTime);
      remainingBudget -= duration;
    }
  }

  return assignments;
}

function findBestSubject(
  slot: TimeSlotTemplate,
  subjects: Subject[],
  settings: { sameSubjectMinGapMinutes: number },
  dailyTotals: Map<string, number>,
  lastEnd: Map<string, string>
): Subject | null {
  // If the slot restricts subjects, only try those
  const candidates = slot.allowedSubjectIds.length > 0
    ? subjects.filter(s => slot.allowedSubjectIds.includes(s.id))
    : subjects;

  for (const subject of candidates) {
    const used = dailyTotals.get(subject.id) || 0;
    if (used + slot.defaultDuration > subject.dailyCapMinutes) continue;

    const lastEndTime = lastEnd.get(subject.id);
    if (lastEndTime) {
      const gapMinutes = timeStringToMinutes(slot.startTime) - timeStringToMinutes(lastEndTime);
      if (gapMinutes < settings.sameSubjectMinGapMinutes) continue;
    }

    return subject;
  }

  return null;
}
