import { Link } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getUsers, getClasses, getTests } from '@/services/db'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function AdminDashboard() {
  const { data: moderators, loading: l1 } = useFirestoreQuery(() => getUsers('moderator'))
  const { data: students, loading: l2 } = useFirestoreQuery(() => getUsers('student'))
  const { data: classes, loading: l3 } = useFirestoreQuery(() => getClasses())
  const { data: tests, loading: l4 } = useFirestoreQuery(() => getTests())

  if (l1 || l2 || l3 || l4) return <LoadingSpinner />

  const cards = [
    { label: 'Модераторлар', count: moderators?.length ?? 0, to: '/admin/moderators', color: 'bg-blue-50 text-blue-700' },
    { label: 'Оқушылар', count: students?.length ?? 0, to: '/admin/students', color: 'bg-green-50 text-green-700' },
    { label: 'Сыныптар', count: classes?.length ?? 0, to: '/admin/classes', color: 'bg-purple-50 text-purple-700' },
    { label: 'Тесттер', count: tests?.length ?? 0, to: '/admin/tests', color: 'bg-orange-50 text-orange-700' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Әкімші тақтасы</h1>
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={`${card.color} rounded-xl p-6 hover:shadow-md transition-shadow`}
          >
            <div className="text-3xl font-bold">{card.count}</div>
            <div className="text-sm mt-1">{card.label}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
