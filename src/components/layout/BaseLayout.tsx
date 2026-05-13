import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { BankHeader } from '@/components/layout/BankHeader'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-lg transition-colors ${
    isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
  }`

export interface NavItem {
  to: string
  label: string
  /** When true, NavLink uses `end` prop (exact match for index routes). */
  end?: boolean
}

interface BaseLayoutProps {
  navItems: NavItem[]
  roleLabel: string
}

export function BaseLayout({ navItems, roleLabel }: BaseLayoutProps) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">EduCore</h2>
          <p className="text-sm text-gray-500">{user?.name}</p>
          <p className="text-xs text-gray-400">{roleLabel}</p>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={signOut}
            className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Шығу
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <BankHeader />
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
