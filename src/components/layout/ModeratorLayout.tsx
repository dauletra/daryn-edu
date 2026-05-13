import { BaseLayout, type NavItem } from '@/components/layout/BaseLayout'

const MODERATOR_NAV: NavItem[] = [
  { to: '/moderator', label: 'Басты бет', end: true },
  { to: '/moderator/subjects', label: 'Пәндер' },
  { to: '/moderator/tests', label: 'Тесттер' },
  { to: '/moderator/results', label: 'Нәтижелер' },
  { to: '/moderator/analytics', label: 'Аналитика' },
  { to: '/moderator/students', label: 'Оқушылар' },
  { to: '/moderator/classes', label: 'Сыныптар' },
]

export function ModeratorLayout() {
  return <BaseLayout navItems={MODERATOR_NAV} roleLabel="Модератор" />
}
