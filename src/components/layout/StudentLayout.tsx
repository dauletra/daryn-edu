import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { TestingProvider, useTesting } from '@/context/TestingContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-lg transition-colors ${
    isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
  }`

const disabledNavClass = 'block px-3 py-2 rounded-lg text-gray-300 cursor-not-allowed select-none'

function StudentSidebar() {
  const { user, signOut } = useAuth()
  const { isTestingActive } = useTesting()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">EduCore</h2>
        <p className="text-sm text-gray-500">{user?.name}</p>
        <p className="text-xs text-gray-400">Ученик</p>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {isTestingActive ? (
          <>
            <span className={disabledNavClass}>Главная</span>
            <span className={disabledNavClass}>Мои тесты</span>
          </>
        ) : (
          <>
            <NavLink to="/student" end className={navLinkClass}>
              Главная
            </NavLink>
            <NavLink to="/student/tests" className={navLinkClass}>
              Мои тесты
            </NavLink>
          </>
        )}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={signOut}
          className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          Выйти
        </button>
      </div>
    </aside>
  )
}

export function StudentLayout() {
  return (
    <TestingProvider>
      <div className="flex h-screen bg-gray-50">
        <StudentSidebar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </TestingProvider>
  )
}
