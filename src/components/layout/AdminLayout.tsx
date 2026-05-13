import { BaseLayout, type NavItem } from '@/components/layout/BaseLayout'

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Басты бет', end: true },
  { to: '/admin/moderators', label: 'Модераторлар' },
  { to: '/admin/classes', label: 'Сыныптар' },
  { to: '/admin/students', label: 'Оқушылар' },
  { to: '/admin/subjects', label: 'Пәндер' },
  { to: '/admin/test-banks', label: 'Тест банктары' },
  { to: '/admin/results', label: 'Нәтижелер' },
  { to: '/admin/analytics', label: 'Аналитика' },
]

export function AdminLayout() {
  return <BaseLayout navItems={ADMIN_NAV} roleLabel="Әкімші" />
}
