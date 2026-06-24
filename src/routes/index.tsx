import { createHashRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';
import KnowledgePage from '@/pages/KnowledgePage';
import DailyPlanPage from '@/pages/DailyPlanPage';
import WeeklyPlanPage from '@/pages/WeeklyPlanPage';
import MonthlyPlanPage from '@/pages/MonthlyPlanPage';
import TimerPage from '@/pages/TimerPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ErrorProblemsPage from '@/pages/ErrorProblemsPage';
import EnvironmentsPage from '@/pages/EnvironmentsPage';
import ReportsPage from '@/pages/ReportsPage';
import CalendarPage from '@/pages/CalendarPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
      { path: 'plan', element: <DailyPlanPage /> },
      { path: 'plan/weekly', element: <WeeklyPlanPage /> },
      { path: 'plan/monthly', element: <MonthlyPlanPage /> },
      { path: 'timer', element: <TimerPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'errors', element: <ErrorProblemsPage /> },
      { path: 'environments', element: <EnvironmentsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
