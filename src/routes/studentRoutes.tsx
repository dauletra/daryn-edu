import { lazy, Suspense } from 'react'
import { type RouteObject } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const StudentDashboard = lazy(() => import('@/pages/Student/StudentDashboard').then((m) => ({ default: m.StudentDashboard })))
const StudentTestsPage = lazy(() => import('@/pages/Student/StudentTestsPage').then((m) => ({ default: m.StudentTestsPage })))
const TestTakingPage = lazy(() => import('@/pages/Student/TestTakingPage').then((m) => ({ default: m.TestTakingPage })))

const fallback = (
  <div className="flex items-center justify-center h-screen">
    <LoadingSpinner />
  </div>
)

export const studentRoutes: RouteObject = {
  path: '/student',
  element: (
    <ProtectedRoute allowedRoles={['student']}>
      <StudentLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Suspense fallback={fallback}><StudentDashboard /></Suspense> },
    { path: 'tests', element: <Suspense fallback={fallback}><StudentTestsPage /></Suspense> },
    { path: 'tests/:id/take', element: <Suspense fallback={fallback}><TestTakingPage /></Suspense> },
  ],
}
