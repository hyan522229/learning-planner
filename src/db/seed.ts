import { generateId } from '@/utils/id';
import { db } from './schema';
import {
  DEFAULT_DAILY_CAP_MINUTES, DEFAULT_BLOCK_DURATION,
  DEFAULT_BREAK_DURATION, DEFAULT_SUBJECT_CAP_MINUTES,
  DEFAULT_SUBJECT_GAP_MINUTES, DEFAULT_MANDATORY_THRESHOLD,
  DEFAULT_SKIP_DAYS_PER_MONTH,
} from '@/engine/constants';

function createDefaultSubjects(personaId: string) {
  return [
    { id: generateId(), personaId, name: '数学', priority: 1, color: '#3b82f6', dailyCapMinutes: DEFAULT_SUBJECT_CAP_MINUTES, icon: 'calculator' },
    { id: generateId(), personaId, name: '物理', priority: 2, color: '#ef4444', dailyCapMinutes: DEFAULT_SUBJECT_CAP_MINUTES, icon: 'flask-conical' },
    { id: generateId(), personaId, name: '化学', priority: 3, color: '#22c55e', dailyCapMinutes: DEFAULT_SUBJECT_CAP_MINUTES, icon: 'flask-conical' },
    { id: generateId(), personaId, name: '生物', priority: 4, color: '#8b5cf6', dailyCapMinutes: DEFAULT_SUBJECT_CAP_MINUTES, icon: 'microscope' },
    { id: generateId(), personaId, name: '英语', priority: 5, color: '#f59e0b', dailyCapMinutes: DEFAULT_SUBJECT_CAP_MINUTES, icon: 'globe' },
    { id: generateId(), personaId, name: '语文', priority: 6, color: '#ec4899', dailyCapMinutes: DEFAULT_SUBJECT_CAP_MINUTES, icon: 'pen-tool' },
  ];
}

function createDefaultEnvironment(personaId: string, name: string, slots: any[], isDefault: boolean) {
  return {
    id: generateId(),
    personaId,
    name,
    timeSlots: slots.map(s => ({ ...s, id: generateId() })),
    isDefault,
  };
}

function makeSchoolDayEnv(personaId: string) {
  return createDefaultEnvironment(personaId, '在校日', [
    { label: '早晨（高能量）', startTime: '07:00', endTime: '07:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '上午第一节', startTime: '08:00', endTime: '08:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '上午第二节', startTime: '09:00', endTime: '09:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '上午第三节', startTime: '10:00', endTime: '10:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '午休', startTime: '12:00', endTime: '13:30', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
    { label: '下午第一节', startTime: '14:00', endTime: '14:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '下午第二节', startTime: '15:00', endTime: '15:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '运动', startTime: '16:00', endTime: '17:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
    { label: '晚间复习', startTime: '19:00', endTime: '19:45', allowedSubjectIds: [], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
    { label: '晚间复习2', startTime: '20:00', endTime: '20:45', allowedSubjectIds: [], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
  ], true);
}

function makeHomeSchoolDayEnv(personaId: string) {
  return createDefaultEnvironment(personaId, '在家上学日', [
    { label: '早晨（高能量）', startTime: '08:00', endTime: '08:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '上午中段', startTime: '09:00', endTime: '09:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '上午后段', startTime: '10:00', endTime: '10:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '上午尾声', startTime: '11:00', endTime: '11:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review', 'error_problem'] as any[], defaultDuration: 45 as const },
    { label: '午休', startTime: '12:00', endTime: '14:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
    { label: '下午前段', startTime: '14:00', endTime: '14:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '下午后段', startTime: '15:00', endTime: '15:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '运动', startTime: '16:00', endTime: '17:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
    { label: '晚间复习', startTime: '19:30', endTime: '20:15', allowedSubjectIds: [], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
    { label: '晚间复习2', startTime: '20:30', endTime: '21:15', allowedSubjectIds: [], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
  ], false);
}

function makeWeekendEnv(personaId: string) {
  return createDefaultEnvironment(personaId, '周末', [
    { label: '上午学习', startTime: '09:00', endTime: '09:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review', 'error_problem'] as any[], defaultDuration: 45 as const },
    { label: '上午学习2', startTime: '10:00', endTime: '10:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '上午学习3', startTime: '11:00', endTime: '11:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '午休', startTime: '12:00', endTime: '14:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
    { label: '下午学习', startTime: '14:00', endTime: '14:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '下午学习2', startTime: '15:00', endTime: '15:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '运动/休息', startTime: '16:00', endTime: '17:30', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
    { label: '晚间', startTime: '19:00', endTime: '19:45', allowedSubjectIds: [], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
  ], false);
}

function makeHolidayEnv(personaId: string) {
  return createDefaultEnvironment(personaId, '假期', [
    { label: '上午学习', startTime: '09:00', endTime: '09:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '上午学习2', startTime: '10:00', endTime: '10:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
    { label: '午休', startTime: '12:00', endTime: '14:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
    { label: '下午自由', startTime: '14:00', endTime: '14:45', allowedSubjectIds: [], allowedBlockTypes: ['new_learning', 'review', 'error_problem'] as any[], defaultDuration: 45 as const },
    { label: '运动', startTime: '16:00', endTime: '17:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
    { label: '晚间', startTime: '19:00', endTime: '19:45', allowedSubjectIds: [], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
  ], false);
}

export async function seedDatabase() {
  const personaCount = await db.personas.count();
  if (personaCount > 0) return; // Already seeded

  const personaId = generateId();
  const now = Date.now();

  // Create default persona
  await db.personas.add({
    id: personaId,
    name: '我',
    avatarEmoji: '➕',
    color: '#0066cc',
    createdAt: now,
  });

  // Create default subjects
  const subjects = createDefaultSubjects(personaId);
  await db.subjects.bulkAdd(subjects);

  // Map subject names to environment slots
  const mathId = subjects[0].id;
  const physicsId = subjects[1].id;
  const chemId = subjects[2].id;
  const bioId = subjects[3].id;
  const engId = subjects[4].id;
  const chineseId = subjects[5].id;

  // Create environments with proper subject mappings
  const schoolEnv = {
    id: generateId(), personaId, name: '在校日', isDefault: true, restDurationMinutes: 10, lunchDurationMinutes: 30,
    timeSlots: [
      { id: generateId(), label: '早晨（高能量）', startTime: '07:00', endTime: '07:45', allowedSubjectIds: [mathId, physicsId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '上午第一节', startTime: '08:00', endTime: '08:45', allowedSubjectIds: [mathId, physicsId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '上午第二节', startTime: '09:00', endTime: '09:45', allowedSubjectIds: [chemId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '上午第三节', startTime: '10:00', endTime: '10:45', allowedSubjectIds: [bioId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '午休', startTime: '12:00', endTime: '13:30', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '下午第一节', startTime: '14:00', endTime: '14:45', allowedSubjectIds: [engId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '下午第二节', startTime: '15:00', endTime: '15:45', allowedSubjectIds: [chineseId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '运动', startTime: '16:00', endTime: '17:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '晚间复习', startTime: '19:00', endTime: '19:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '晚间复习2', startTime: '20:00', endTime: '20:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
    ],
  };

  const homeEnv = {
    id: generateId(), personaId, name: '在家上学日', isDefault: false, restDurationMinutes: 10, lunchDurationMinutes: 30,
    timeSlots: [
      { id: generateId(), label: '早晨（高能量）', startTime: '08:00', endTime: '08:45', allowedSubjectIds: [mathId, physicsId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '上午中段', startTime: '09:00', endTime: '09:45', allowedSubjectIds: [chemId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '上午后段', startTime: '10:00', endTime: '10:45', allowedSubjectIds: [bioId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '上午尾声', startTime: '11:00', endTime: '11:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId], allowedBlockTypes: ['new_learning', 'review', 'error_problem'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '午休', startTime: '12:00', endTime: '14:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '下午前段', startTime: '14:00', endTime: '14:45', allowedSubjectIds: [engId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '下午后段', startTime: '15:00', endTime: '15:45', allowedSubjectIds: [chineseId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '运动', startTime: '16:00', endTime: '17:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '晚间复习', startTime: '19:30', endTime: '20:15', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '晚间复习2', startTime: '20:30', endTime: '21:15', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
    ],
  };

  const weekendEnv = {
    id: generateId(), personaId, name: '周末', isDefault: false, restDurationMinutes: 10, lunchDurationMinutes: 30,
    timeSlots: [
      { id: generateId(), label: '上午学习', startTime: '09:00', endTime: '09:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['new_learning', 'review', 'error_problem'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '上午学习2', startTime: '10:00', endTime: '10:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '上午学习3', startTime: '11:00', endTime: '11:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '午休', startTime: '12:00', endTime: '14:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '下午学习', startTime: '14:00', endTime: '14:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '下午学习2', startTime: '15:00', endTime: '15:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '运动/休息', startTime: '16:00', endTime: '17:30', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '晚间', startTime: '19:00', endTime: '19:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
    ],
  };

  const holidayEnv = {
    id: generateId(), personaId, name: '假期', isDefault: false, restDurationMinutes: 10, lunchDurationMinutes: 30,
    timeSlots: [
      { id: generateId(), label: '上午学习', startTime: '09:00', endTime: '09:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '上午学习2', startTime: '10:00', endTime: '10:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['new_learning', 'review'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '午休', startTime: '12:00', endTime: '14:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '下午自由', startTime: '14:00', endTime: '14:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['new_learning', 'review', 'error_problem'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '运动', startTime: '16:00', endTime: '17:00', allowedSubjectIds: [], allowedBlockTypes: ['exercise'] as any[], defaultDuration: 45 as const },
      { id: generateId(), label: '晚间', startTime: '19:00', endTime: '19:45', allowedSubjectIds: [mathId, physicsId, chemId, bioId, engId, chineseId], allowedBlockTypes: ['review', 'error_problem'] as any[], defaultDuration: 45 as const },
    ],
  };

  await db.environments.bulkAdd([schoolEnv, homeEnv, weekendEnv, holidayEnv]);

  // Create default settings
  await db.settings.add({
    id: personaId,
    personaId,
    dailyTotalCapMinutes: DEFAULT_DAILY_CAP_MINUTES,
    defaultBlockDuration: DEFAULT_BLOCK_DURATION,
    breakDurationMinutes: DEFAULT_BREAK_DURATION,
    sameSubjectMinGapMinutes: DEFAULT_SUBJECT_GAP_MINUTES,
    mandatoryThresholdPercent: DEFAULT_MANDATORY_THRESHOLD,
    skipDaysPerMonth: DEFAULT_SKIP_DAYS_PER_MONTH,
    skipDaysUsedThisMonth: 0,
    lastSkipResetMonth: now,
    recoveryDayEnabled: true,
    autoPromptNewProject: true,
    soundEnabled: true,
    taskCompleteMusicEnabled: true,
    restAlarmEnabled: true,
    theme: 'system',
    newKnowledgePerDayLimit: 3,
    autoSkipEnabled: false,
  });
}
