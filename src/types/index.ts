export type MeasureType = 'pages' | 'questions' | 'minutes' | 'words' | 'articles';
export type BlockType = 'new_learning' | 'review' | 'error_problem' | 'exercise';
export type BlockStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
export type KnowledgeStatus = 'active' | 'completed' | 'paused';
export type ErrorStatus = 'pending' | 'checking' | 'cleared';
export type PlanStatus = 'draft' | 'active' | 'completed';
export type Priority = 1 | 2 | 3 | 4 | 5;
export type ProjectCategory = 'study' | 'work' | 'exercise';

export interface Persona {
  id: string;
  name: string;
  avatarEmoji: string;
  avatarImage?: string;
  color: string;
  createdAt: number;
}

export interface Subject {
  id: string;
  personaId: string;
  name: string;
  priority: number;
  color: string;
  dailyCapMinutes: number;
  icon: string;
}

export interface KnowledgePoint {
  id: string;
  personaId: string;
  subjectId: string;
  name: string;
  studyDate: number;
  currentStage: number;
  nextReviewDate: number;
  reviewDates: number[];
  reviewDurationMinutes: number;
  masteryRating: number;
  consecutiveCorrect: number;
  errorCount: number;
  errorAtStage: number;
  status: KnowledgeStatus;
  enabledStages?: boolean[];
  createdAt: number;
  updatedAt: number;
}

export interface SpeedRecord {
  date: number;
  amountCompleted: number;
  durationMinutes: number;
  speed: number;
}

export interface Project {
  id: string;
  personaId: string;
  subjectId?: string;
  name: string;
  measureType: MeasureType;
  category: ProjectCategory;
  total: number;
  completed: number;
  priority: Priority;
  speedRecords: SpeedRecord[];
  currentSpeedEWMA: number;
  status: 'active' | 'completed' | 'archived';
  createReviewOnComplete: boolean;
  dailyBlockLimit: number;
  createdAt: number;
  completedAt: number | null;
}

export interface Block {
  id: string;
  personaId: string;
  type: BlockType;
  subjectId?: string;
  projectId?: string;
  name: string;
  estimatedDurationMinutes: number;
  actualDurationMinutes?: number;
  difficulty?: 1 | 2 | 3;
  knowledgePointIds?: string[];
  errorProblemIds?: string[];
  date: number;
  timeSlotStart: string;
  timeSlotEnd: string;
  status: BlockStatus;
  completedAt?: number;
  sortOrder: number;
}

export interface ErrorProblem {
  id: string;
  personaId: string;
  subjectId?: string;
  name: string;
  addedDate: number;
  nextReviewDate: number;
  reviewCount: number;
  status: ErrorStatus;
  checkDate?: number;
  createdAt: number;
}

export interface TimeSlotTemplate {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  allowedSubjectIds: string[];
  allowedBlockTypes: BlockType[];
  defaultDuration: 30 | 45;
}

export interface Environment {
  id: string;
  personaId: string;
  name: string;
  timeSlots: TimeSlotTemplate[];
  restDurationMinutes: number;
  lunchDurationMinutes: number;
  isDefault: boolean;
}

export interface DailyPlan {
  id: string;
  personaId: string;
  environmentId: string;
  date: number;
  blockIds: string[];
  availableMinutes: number;
  mandatoryMinutes: number;
  newLearningMinutes: number;
  status: PlanStatus;
  dailyRating?: number;
  generatedAt: number;
}

export interface DailyStatus {
  id: string;
  personaId: string;
  date: number;
  completedBlocks: number;
  reviewedPoints: number;
  clearedErrors: number;
  rating?: number;
  note?: string;
}

export interface AppSettings {
  id: string;
  personaId: string;
  dailyTotalCapMinutes: number;
  defaultBlockDuration: 30 | 45;
  breakDurationMinutes: number;
  sameSubjectMinGapMinutes: number;
  mandatoryThresholdPercent: number;
  skipDaysPerMonth: number;
  skipDaysUsedThisMonth: number;
  lastSkipResetMonth: number;
  recoveryDayEnabled: boolean;
  autoPromptNewProject: boolean;
  soundEnabled: boolean;
  taskCompleteMusicEnabled: boolean;
  restAlarmEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  newKnowledgePerDayLimit: number;
  autoSkipEnabled: boolean;
}

export interface ProgressLog {
  id: string;
  projectId: string;
  personaId: string;
  amount: number;
  durationMinutes: number;
  date: number;
  note?: string;
}

export interface TimerState {
  phase: 'idle' | 'running' | 'paused' | 'completed';
  currentBlockId: string | null;
  totalSeconds: number;
  remainingSeconds: number;
  startedAt: number | null;
  targetEnd: number | null;
  lastElapsedSeconds: number;
}

export type AudioCategory = 'task_complete' | 'rest_alarm';

export interface ProjectCollection {
  id: string;
  personaId: string;
  name: string;
  projectIds: string[];
  mode: 'single' | 'dual';
  createdAt: number;
}

export interface AudioFile {
  id: string;
  personaId: string;
  category: AudioCategory;
  name: string;
  data: Blob;
  createdAt: number;
}
