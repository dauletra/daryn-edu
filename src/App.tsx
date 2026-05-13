import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { BankProvider } from '@/context/BankContext'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { RouteErrorBoundary } from '@/components/feedback/RouteErrorBoundary'
import { publicRoutes } from '@/routes/publicRoutes'
import { adminRoutes } from '@/routes/adminRoutes'
import { moderatorRoutes } from '@/routes/moderatorRoutes'
import { studentRoutes } from '@/routes/studentRoutes'

const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorBoundary />,
    children: [
      ...publicRoutes,
      adminRoutes,
      moderatorRoutes,
      studentRoutes,
    ],
  },
])

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BankProvider>
            <RouterProvider router={router} />
          </BankProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
