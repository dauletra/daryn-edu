import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-lg transition-colors ${
    isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
  }`

export function ModeratorLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">EduCore</h2>
          <p className="text-sm text-gray-500">{user?.name}</p>
          <p className="text-xs text-gray-400">Модератор</p>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          <NavLink to="/moderator" end className={navLinkClass}>
            Главная
          </NavLink>
          <NavLink to="/moderator/subjects" className={navLinkClass}>
            Предметы
          </NavLink>
          <NavLink to="/moderator/tests" className={navLinkClass}>
            Тесты
          </NavLink>
          <NavLink to="/moderator/results" className={navLinkClass}>
            Результаты
          </NavLink>
          <NavLink to="/moderator/analytics" className={navLinkClass}>
            Аналитика
          </NavLink>
          <NavLink to="/moderator/students" className={navLinkClass}>
            Ученики
          </NavLink>
          <NavLink to="/moderator/classes" className={navLinkClass}>
            Классы
          </NavLink>
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
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
