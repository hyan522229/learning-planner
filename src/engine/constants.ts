export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60, 120, 240, 365];

export const DEFAULT_DAILY_CAP_MINUTES = 8 * 60;
export const DEFAULT_BLOCK_DURATION = 45;
export const DEFAULT_BREAK_DURATION = 10;
export const DEFAULT_LUNCH_DURATION = 30;
export const DEFAULT_SUBJECT_CAP_MINUTES = 90;
export const DEFAULT_SUBJECT_GAP_MINUTES = 240;
export const DEFAULT_MANDATORY_THRESHOLD = 80;
export const DEFAULT_SKIP_DAYS_PER_MONTH = 2;
export const DEFAULT_NEW_KNOWLEDGE_PER_DAY = 3;
export const DEFAULT_AUTO_SKIP_ENABLED = false;

export const REVIEW_BLOCK_MINUTES = 10;
export const ERROR_BLOCK_MINUTES = 15;

export const PRIORITY_LABELS: Record<number, string> = {
  1: '最高', 2: '较高', 3: '普通', 4: '较低', 5: '最低',
};

export const SUBJECT_ICONS = [
  'book-open', 'flask-conical', 'calculator', 'globe', 'pen-tool',
  'music', 'palette', 'dumbbell', 'code-2', 'microscope'
];

export const SUBJECT_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];
