import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ModeratorLayout } from '@/components/layout/ModeratorLayout'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { LoginPage } from '@/pages/Login/LoginPage'
import { AdminDashboard } from '@/pages/Admin/AdminDashboard'
import { ModeratorsPage } from '@/pages/Admin/ModeratorsPage'
import { ClassesListPage } from '@/pages/shared/ClassesListPage'
import { ClassDetailPage } from '@/pages/shared/ClassDetailPage'
import { StudentsPage } from '@/pages/shared/StudentsPage'
import { AdminTestsPage } from '@/pages/Admin/AdminTestsPage'
import { AdminResultsPage } from '@/pages/Admin/AdminResultsPage'
import { AdminAnalyticsPage } from '@/pages/Admin/AdminAnalyticsPage'
import { TestBanksPage } from '@/pages/Admin/TestBanksPage'
import { TestBankDetailPage } from '@/pages/Admin/TestBankDetailPage'
import { ModeratorDashboard } from '@/pages/Moderator/ModeratorDashboard'
import { TestsPage } from '@/pages/Moderator/TestsPage'
import { TestCreatePage } from '@/pages/Moderator/TestCreatePage'
import { TestEditPage } from '@/pages/Moderator/TestEditPage'
import { TestResultsPage } from '@/pages/Moderator/TestResultsPage'
import { SubjectsPage } from '@/pages/Moderator/SubjectsPage'
import { TestViewPage } from '@/pages/shared/TestViewPage'
import { StudentDashboard } from '@/pages/Student/StudentDashboard'
import { StudentTestsPage } from '@/pages/Student/StudentTestsPage'
import { TestTakingPage } from '@/pages/Student/TestTakingPage'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
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
      { index: true, element: <AdminDashboard /> },
      { path: 'moderators', element: <ModeratorsPage /> },
      { path: 'classes', element: <ClassesListPage basePath="/admin/classes" /> },
      { path: 'classes/:id', element: <ClassDetailPage backTo="/admin/classes" backLabel="Классы" /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'subjects', element: <SubjectsPage /> },
      { path: 'test-banks', element: <TestBanksPage /> },
      { path: 'test-banks/:id', element: <TestBankDetailPage /> },
      { path: 'tests', element: <AdminTestsPage /> },
      { path: 'tests/:id/view', element: <TestViewPage backTo="/admin/tests" backLabel="Назад к списку тестов" /> },
      { path: 'results', element: <AdminResultsPage /> },
      { path: 'analytics', element: <AdminAnalyticsPage /> },
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
      { index: true, element: <ModeratorDashboard /> },
      { path: 'subjects', element: <SubjectsPage /> },
      { path: 'tests', element: <TestsPage /> },
      { path: 'tests/new', element: <TestCreatePage /> },
      { path: 'tests/:id/edit', element: <TestEditPage /> },
      { path: 'tests/:id/view', element: <TestViewPage backTo="/moderator/tests" backLabel="Назад к тестам" /> },
      { path: 'tests/:id/results', element: <TestResultsPage /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'classes', element: <ClassesListPage basePath="/moderator/classes" /> },
      { path: 'classes/:id', element: <ClassDetailPage backTo="/moderator/classes" backLabel="Классы" /> },
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
      { index: true, element: <StudentDashboard /> },
      { path: 'tests', element: <StudentTestsPage /> },
      { path: 'tests/:id/take', element: <TestTakingPage /> },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}
