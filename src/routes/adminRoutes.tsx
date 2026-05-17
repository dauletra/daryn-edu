import { lazy, Suspense } from 'react'
import { type RouteObject } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const AdminDashboard = lazy(() => import('@/pages/Admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const ModeratorsPage = lazy(() => import('@/pages/Admin/ModeratorsPage').then((m) => ({ default: m.ModeratorsPage })))
const AdminSubjectsPage = lazy(() => import('@/pages/Admin/AdminSubjectsPage').then((m) => ({ default: m.AdminSubjectsPage })))
const TestBanksPage = lazy(() => import('@/pages/Admin/TestBanksPage').then((m) => ({ default: m.TestBanksPage })))
const TestBankDetailPage = lazy(() => import('@/pages/Admin/TestBankDetailPage').then((m) => ({ default: m.TestBankDetailPage })))
const AdminTestsPage = lazy(() => import('@/pages/Admin/AdminTestsPage').then((m) => ({ default: m.AdminTestsPage })))
const AdminResultsPage = lazy(() => import('@/pages/Admin/AdminResultsPage').then((m) => ({ default: m.AdminResultsPage })))
const AdminAnalyticsPage = lazy(() => import('@/pages/Admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })))
const ReportHomePage = lazy(() => import('@/pages/Admin/ReportHomePage').then((m) => ({ default: m.ReportHomePage })))
const BankReportPage = lazy(() => import('@/pages/Admin/BankReportPage').then((m) => ({ default: m.BankReportPage })))
const CompareReportPage = lazy(() => import('@/pages/Admin/CompareReportPage').then((m) => ({ default: m.CompareReportPage })))
const ClassesListPage = lazy(() => import('@/pages/shared/ClassesListPage').then((m) => ({ default: m.ClassesListPage })))
const ClassDetailPage = lazy(() => import('@/pages/shared/ClassDetailPage').then((m) => ({ default: m.ClassDetailPage })))
const StudentsPage = lazy(() => import('@/pages/shared/StudentsPage').then((m) => ({ default: m.StudentsPage })))
const TestViewPage = lazy(() => import('@/pages/shared/TestViewPage').then((m) => ({ default: m.TestViewPage })))
const TestEditPage = lazy(() => import('@/pages/Moderator/TestEditPage').then((m) => ({ default: m.TestEditPage })))

const fallback = (
  <div className="flex items-center justify-center h-screen">
    <LoadingSpinner />
  </div>
)

export const adminRoutes: RouteObject = {
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
    { path: 'tests/:id/edit', element: <Suspense fallback={fallback}><TestEditPage backTo="/admin/tests" backLabel="Тесттерге оралу" /></Suspense> },
    { path: 'results', element: <Suspense fallback={fallback}><AdminResultsPage /></Suspense> },
    { path: 'analytics', element: <Suspense fallback={fallback}><AdminAnalyticsPage /></Suspense> },
    { path: 'report', element: <Suspense fallback={fallback}><ReportHomePage /></Suspense> },
    { path: 'report/bank/:bankId', element: <Suspense fallback={fallback}><BankReportPage /></Suspense> },
    { path: 'report/compare', element: <Suspense fallback={fallback}><CompareReportPage /></Suspense> },
  ],
}
