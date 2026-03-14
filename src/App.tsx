import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { BankProvider } from '@/context/BankContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ModeratorLayout } from '@/components/layout/ModeratorLayout'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Lazy-loaded pages
const LoginPage         = lazy(() => import('@/pages/Login/LoginPage').then(m => ({ default: m.LoginPage })))
const AdminDashboard    = lazy(() => import('@/pages/Admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const ModeratorsPage    = lazy(() => import('@/pages/Admin/ModeratorsPage').then(m => ({ default: m.ModeratorsPage })))
const AdminSubjectsPage = lazy(() => import('@/pages/Admin/AdminSubjectsPage').then(m => ({ default: m.AdminSubjectsPage })))
const TestBanksPage     = lazy(() => import('@/pages/Admin/TestBanksPage').then(m => ({ default: m.TestBanksPage })))
const TestBankDetailPage = lazy(() => import('@/pages/Admin/TestBankDetailPage').then(m => ({ default: m.TestBankDetailPage })))
const AdminTestsPage    = lazy(() => import('@/pages/Admin/AdminTestsPage').then(m => ({ default: m.AdminTestsPage })))
const AdminResultsPage  = lazy(() => import('@/pages/Admin/AdminResultsPage').then(m => ({ default: m.AdminResultsPage })))
const AdminAnalyticsPage = lazy(() => import('@/pages/Admin/AdminAnalyticsPage').then(m => ({ default: m.AdminAnalyticsPage })))
const ClassesListPage   = lazy(() => import('@/pages/shared/ClassesListPage').then(m => ({ default: m.ClassesListPage })))
const ClassDetailPage   = lazy(() => import('@/pages/shared/ClassDetailPage').then(m => ({ default: m.ClassDetailPage })))
const StudentsPage      = lazy(() => import('@/pages/shared/StudentsPage').then(m => ({ default: m.StudentsPage })))
const TestViewPage      = lazy(() => import('@/pages/shared/TestViewPage').then(m => ({ default: m.TestViewPage })))
const ModeratorDashboard = lazy(() => import('@/pages/Moderator/ModeratorDashboard').then(m => ({ default: m.ModeratorDashboard })))
const SubjectsPage      = lazy(() => import('@/pages/Moderator/SubjectsPage').then(m => ({ default: m.SubjectsPage })))
const TestsPage         = lazy(() => import('@/pages/Moderator/TestsPage').then(m => ({ default: m.TestsPage })))
const TestCreatePage    = lazy(() => import('@/pages/Moderator/TestCreatePage').then(m => ({ default: m.TestCreatePage })))
const TestEditPage      = lazy(() => import('@/pages/Moderator/TestEditPage').then(m => ({ default: m.TestEditPage })))
const TestResultsPage   = lazy(() => import('@/pages/Moderator/TestResultsPage').then(m => ({ default: m.TestResultsPage })))
const StudentDashboard  = lazy(() => import('@/pages/Student/StudentDashboard').then(m => ({ default: m.StudentDashboard })))
const StudentTestsPage  = lazy(() => import('@/pages/Student/StudentTestsPage').then(m => ({ default: m.StudentTestsPage })))
const TestTakingPage    = lazy(() => import('@/pages/Student/TestTakingPage').then(m => ({ default: m.TestTakingPage })))

const fallback = (
  <div className="flex items-center justify-center h-screen">
    <LoadingSpinner />
  </div>
)

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense fallback={fallback}><LoginPage /></Suspense>,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Suspense fallback={fallback}><AdminDashboard /></Suspense> },
      { path: 'moderators', element: <Suspense fallback={fallback}><ModeratorsPage /></Suspense> },
      { path: 'classes', element: <Suspense fallback={fallback}><ClassesListPage basePath="/admin/classes" /></Suspense> },
      { path: 'classes/:id', element: <Suspense fallback={fallback}><ClassDetailPage backTo="/admin/classes" backLabel="Классы" /></Suspense> },
      { path: 'students', element: <Suspense fallback={fallback}><StudentsPage /></Suspense> },
      { path: 'subjects', element: <Suspense fallback={fallback}><AdminSubjectsPage /></Suspense> },
      { path: 'test-banks', element: <Suspense fallback={fallback}><TestBanksPage /></Suspense> },
      { path: 'test-banks/:id', element: <Suspense fallback={fallback}><TestBankDetailPage /></Suspense> },
      { path: 'tests', element: <Suspense fallback={fallback}><AdminTestsPage /></Suspense> },
      { path: 'tests/:id/view', element: <Suspense fallback={fallback}><TestViewPage backTo="/admin/test-banks" backLabel="Банки тестов" /></Suspense> },
      { path: 'results', element: <Suspense fallback={fallback}><AdminResultsPage /></Suspense> },
      { path: 'analytics', element: <Suspense fallback={fallback}><AdminAnalyticsPage /></Suspense> },
    ],
  },
  {
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
  },
  {
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
  },
])

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BankProvider>
          <RouterProvider router={router} />
        </BankProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
