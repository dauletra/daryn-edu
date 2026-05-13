import { lazy, Suspense } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const LoginPage = lazy(() => import('@/pages/Login/LoginPage').then((m) => ({ default: m.LoginPage })))
const OpenTestPage = lazy(() => import('@/pages/public/OpenTestPage').then((m) => ({ default: m.OpenTestPage })))

const fallback = (
  <div className="flex items-center justify-center h-screen">
    <LoadingSpinner />
  </div>
)

export const publicRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <Suspense fallback={fallback}><LoginPage /></Suspense>,
  },
  {
    path: '/open-test/:id',
    element: <Suspense fallback={fallback}><OpenTestPage /></Suspense>,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
]
