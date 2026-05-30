import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import { calculateEWMA, recordSpeed, calculateProgress } from '@/engine/progress-calc';
import type { Project, MeasureType, Priority, ProgressLog, SpeedRecord, ProjectCategory } from '@/types';

interface ProjectState {
  addProject: (data: {
    personaId: string; name: string; measureType: MeasureType;
    category: ProjectCategory;
    total: number; completed: number; priority: Priority; subjectId?: string;
    initialSpeed?: number;
  }) => Promise<string>;
  updateProgress: (id: string, amountCompleted: number, durationMinutes: number) => Promise<number>;
  getProgressLogs: (projectId: string) => Promise<ProgressLog[]>;
  deleteProgressLog: (logId: string) => Promise<void>;
  getAllProjects: (personaId: string) => Promise<Project[]>;
  deleteProject: (id: string) => Promise<void>;
  updatePriority: (id: string, priority: Priority) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>(() => ({
  addProject: async (data) => {
    const id = generateId();
    const now = Date.now();
    const speedRecords: SpeedRecord[] = data.initialSpeed && data.initialSpeed > 0
      ? [{ date: now, amountCompleted: 0, durationMinutes: 60, speed: data.initialSpeed }]
      : [];
    const project: Project = {
      personaId: data.personaId,
      name: data.name,
      measureType: data.measureType,
      category: data.category,
      total: data.total,
      completed: data.completed,
      priority: data.priority,
      subjectId: data.subjectId,
      id,
      speedRecords,
      currentSpeedEWMA: data.initialSpeed || 0,
      status: 'active',
      createdAt: now,
      completedAt: null,
    };
    await db.projects.add(project);

    // Seed a log entry for initial progress so it's included in all future calculations
    if (data.completed > 0) {
      await db.progressLogs.add({
        id: generateId(),
        projectId: id,
        personaId: data.personaId,
        amount: data.completed,
        durationMinutes: 0,
        date: now,
        note: '初始进度',
      });
    }

    return id;
  },

  updateProgress: async (id, amountCompleted, durationMinutes) => {
    const project = await db.projects.get(id);
    if (!project) throw new Error('项目未找到');

    // Check existing logs BEFORE adding the new one, so we can detect
    // projects created before the seed-log fix where initial progress
    // is stored on the project but not in any log entry.
    const existingLogs = await db.progressLogs.where({ projectId: id }).toArray();
    const existingTotal = existingLogs.reduce((sum, l) => sum + l.amount, 0);

    // Repair: if the project's completed value exceeds what the logs account for,
    // seed the difference so it isn't lost on recalculation.
    if (project.completed > existingTotal) {
      await db.progressLogs.add({
        id: generateId(),
        projectId: id,
        personaId: project.personaId,
        amount: project.completed - existingTotal,
        durationMinutes: 0,
        date: project.createdAt,
        note: '初始进度',
      });
    }

    // Create the new log entry
    const log: ProgressLog = {
      id: generateId(),
      projectId: id,
      personaId: project.personaId,
      amount: amountCompleted,
      durationMinutes,
      date: Date.now(),
    };
    await db.progressLogs.add(log);

    // Recalculate speed from all logs (now includes repair seed + new entry)
    const logs = await db.progressLogs.where({ projectId: id }).toArray();
    const records: SpeedRecord[] = logs.map(l => ({
      date: l.date,
      amountCompleted: l.amount,
      durationMinutes: l.durationMinutes,
      speed: l.durationMinutes > 0 ? l.amount / (l.durationMinutes / 60) : 0,
    }));
    // Add initial speed record if it exists
    if (project.speedRecords.length > 0 && project.speedRecords[0].amountCompleted === 0) {
      records.unshift(project.speedRecords[0]);
    }
    const ewma = records.length > 0 ? calculateEWMA(records) : 0;
    const newCompleted = logs.reduce((sum, l) => sum + l.amount, 0);
    const progress = calculateProgress(newCompleted, project.total);

    await db.projects.update(id, {
      completed: newCompleted,
      speedRecords: records,
      currentSpeedEWMA: Math.round(ewma * 10) / 10,
      status: progress >= 100 ? 'completed' : project.status,
      completedAt: progress >= 100 ? Date.now() : null,
    });

    return progress;
  },

  getProgressLogs: async (projectId) => {
    return db.progressLogs
      .where({ projectId })
      .reverse()
      .sortBy('date');
  },

  deleteProgressLog: async (logId) => {
    const log = await db.progressLogs.get(logId);
    if (!log) return;
    await db.progressLogs.delete(logId);

    // Recalculate project totals
    const project = await db.projects.get(log.projectId);
    if (!project) return;
    let logs = await db.progressLogs.where({ projectId: log.projectId }).toArray();

    // Repair seed log if needed (same pattern as updateProgress)
    const existingTotal = logs.reduce((sum, l) => sum + l.amount, 0);
    if (project.completed > existingTotal) {
      const repairLog: ProgressLog = {
        id: generateId(),
        projectId: log.projectId,
        personaId: project.personaId,
        amount: project.completed - existingTotal,
        durationMinutes: 0,
        date: project.createdAt,
        note: '初始进度',
      };
      await db.progressLogs.add(repairLog);
      logs = [...logs, repairLog];
    }
    const records: SpeedRecord[] = logs.map(l => ({
      date: l.date,
      amountCompleted: l.amount,
      durationMinutes: l.durationMinutes,
      speed: l.durationMinutes > 0 ? l.amount / (l.durationMinutes / 60) : 0,
    }));
    if (project.speedRecords.length > 0 && project.speedRecords[0].amountCompleted === 0) {
      records.unshift(project.speedRecords[0]);
    }
    const ewma = records.length > 0 ? calculateEWMA(records) : 0;
    const newCompleted = logs.reduce((sum, l) => sum + l.amount, 0);

    await db.projects.update(log.projectId, {
      completed: newCompleted,
      speedRecords: records,
      currentSpeedEWMA: Math.round(ewma * 10) / 10,
    });
  },

  getAllProjects: async (personaId) => {
    return db.projects.where({ personaId }).reverse().sortBy('createdAt');
  },

  deleteProject: async (id) => {
    await db.projects.delete(id);
    // Also clean up logs
    await db.progressLogs.where({ projectId: id }).delete();
  },

  updatePriority: async (id, priority) => {
    await db.projects.update(id, { priority });
  },

  archiveProject: async (id) => {
    await db.projects.update(id, { status: 'archived' });
  },
}));
