import { lazy, Suspense } from 'react'
import { type RouteObject } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { ModeratorLayout } from '@/components/layout/ModeratorLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const ModeratorDashboard = lazy(() => import('@/pages/Moderator/ModeratorDashboard').then((m) => ({ default: m.ModeratorDashboard })))
const SubjectsPage = lazy(() => import('@/pages/Moderator/SubjectsPage').then((m) => ({ default: m.SubjectsPage })))
const TestsPage = lazy(() => import('@/pages/Moderator/TestsPage').then((m) => ({ default: m.TestsPage })))
const TestCreatePage = lazy(() => import('@/pages/Moderator/TestCreatePage').then((m) => ({ default: m.TestCreatePage })))
const TestEditPage = lazy(() => import('@/pages/Moderator/TestEditPage').then((m) => ({ default: m.TestEditPage })))
const TestResultsPage = lazy(() => import('@/pages/Moderator/TestResultsPage').then((m) => ({ default: m.TestResultsPage })))
// Moderator reuses several admin/shared pages
const AdminResultsPage = lazy(() => import('@/pages/Admin/AdminResultsPage').then((m) => ({ default: m.AdminResultsPage })))
const AdminAnalyticsPage = lazy(() => import('@/pages/Admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })))
const ClassesListPage = lazy(() => import('@/pages/shared/ClassesListPage').then((m) => ({ default: m.ClassesListPage })))
const ClassDetailPage = lazy(() => import('@/pages/shared/ClassDetailPage').then((m) => ({ default: m.ClassDetailPage })))
const StudentsPage = lazy(() => import('@/pages/shared/StudentsPage').then((m) => ({ default: m.StudentsPage })))
const TestViewPage = lazy(() => import('@/pages/shared/TestViewPage').then((m) => ({ default: m.TestViewPage })))

const fallback = (
  <div className="flex items-center justify-center h-screen">
    <LoadingSpinner />
  </div>
)

export const moderatorRoutes: RouteObject = {
  path: '/moderator',
  element: (
    <ProtectedRoute allowedRoles={['moderator', 'admin']}>
      <ModeratorLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Suspense fallback={fallback}><ModeratorDashboard /></Suspense> },
    { path: 'subjects', element: <Suspense fallback={fallback}><SubjectsPage /></Suspense> },
    { path: 'tests', element: <Suspense fallback={fallback}><TestsPage /></Suspense> },
    { path: 'tests/new', element: <Suspense fallback={fallback}><TestCreatePage /></Suspense> },
    { path: 'tests/:id/edit', element: <Suspense fallback={fallback}><TestEditPage /></Suspense> },
    { path: 'tests/:id/view', element: <Suspense fallback={fallback}><TestViewPage backTo="/moderator/tests" backLabel="Назад к тестам" /></Suspense> },
    { path: 'tests/:id/results', element: <Suspense fallback={fallback}><TestResultsPage /></Suspense> },
    { path: 'results', element: <Suspense fallback={fallback}><AdminResultsPage /></Suspense> },
    { path: 'analytics', element: <Suspense fallback={fallback}><AdminAnalyticsPage /></Suspense> },
    { path: 'students', element: <Suspense fallback={fallback}><StudentsPage /></Suspense> },
    { path: 'classes', element: <Suspense fallback={fallback}><ClassesListPage basePath="/moderator/classes" /></Suspense> },
    { path: 'classes/:id', element: <Suspense fallback={fallback}><ClassDetailPage backTo="/moderator/classes" backLabel="Классы" /></Suspense> },
  ],
}
