import Dexie, { type Table } from 'dexie';
import type {
  Persona, Subject, KnowledgePoint, Project, Block,
  ErrorProblem, Environment, DailyPlan, DailyStatus, AppSettings, ProgressLog
} from '@/types';
import { generateId } from '@/utils/id';

export class LearningPlannerDB extends Dexie {
  personas!: Table<Persona, string>;
  subjects!: Table<Subject, string>;
  knowledgePoints!: Table<KnowledgePoint, string>;
  projects!: Table<Project, string>;
  blocks!: Table<Block, string>;
  errorProblems!: Table<ErrorProblem, string>;
  environments!: Table<Environment, string>;
  dailyPlans!: Table<DailyPlan, string>;
  dailyStatuses!: Table<DailyStatus, string>;
  settings!: Table<AppSettings, string>;
  progressLogs!: Table<ProgressLog, string>;

  constructor() {
    super('learning-planner');

    this.version(1).stores({
      personas: 'id',
      subjects: 'id, personaId, priority',
      knowledgePoints: 'id, personaId, subjectId, nextReviewDate, status, [personaId+nextReviewDate], [personaId+status]',
      projects: 'id, personaId, subjectId, status, [personaId+status]',
      blocks: 'id, personaId, date, status, [personaId+date], [personaId+date+status]',
      errorProblems: 'id, personaId, subjectId, nextReviewDate, status, [personaId+nextReviewDate], [personaId+status]',
      environments: 'id, personaId',
      dailyPlans: 'id, personaId, date',
      dailyStatuses: 'id, personaId, date',
      settings: 'id',
    });

    this.version(2).stores({
      personas: 'id',
      subjects: 'id, personaId, priority',
      knowledgePoints: 'id, personaId, subjectId, nextReviewDate, status, [personaId+nextReviewDate], [personaId+status]',
      projects: 'id, personaId, subjectId, status, [personaId+status]',
      blocks: 'id, personaId, date, status, [personaId+date], [personaId+date+status]',
      errorProblems: 'id, personaId, subjectId, nextReviewDate, status, [personaId+nextReviewDate], [personaId+status]',
      environments: 'id, personaId',
      dailyPlans: 'id, personaId, date',
      dailyStatuses: 'id, personaId, date',
      settings: 'id',
      progressLogs: 'id, projectId, personaId, date, [projectId+date]',
    });
  }
}

export const db = new LearningPlannerDB();
