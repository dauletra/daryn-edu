import { Link, useParams } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTestBank, getTestsByBank, getUsers } from '@/services/db'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function TestBankDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: bank, loading: loadingBank } = useFirestoreQuery(
    () => getTestBank(id!),
    [id]
  )
  const { data: tests, loading: loadingTests } = useFirestoreQuery(
    () => getTestsByBank(id!),
    [id]
  )
  const { data: moderators, loading: loadingModerators } = useFirestoreQuery(() => getUsers('moderator'))

  if (loadingBank || loadingTests || loadingModerators) return <LoadingSpinner />

  if (!bank) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Банк тестов не найден</p>
        <Link to="/admin/test-banks">
          <Button variant="secondary" className="mt-4">Назад к банкам</Button>
        </Link>
      </div>
    )
  }

  const getCreatorName = (uid: string) => {
    const mod = moderators?.find((m) => m.uid === uid)
    return mod?.name ?? '—'
  }

  const publishedCount = tests?.filter((t) => t.published).length ?? 0
  const draftCount = (tests?.length ?? 0) - publishedCount

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/test-banks" className="text-sm text-blue-600 hover:text-blue-800">
          Банки тестов
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{bank.name}</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{tests?.length ?? 0}</div>
          <div className="text-xs text-gray-500">Всего тестов</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
          <div className="text-xs text-gray-500">Опубликовано</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">{draftCount}</div>
          <div className="text-xs text-gray-500">Черновики</div>
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {bank.quarter} четверть, {bank.academicYear} г.
      </div>

      {tests && tests.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Название</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Предмет</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Автор</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Вопросов</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{test.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{test.subject}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{getCreatorName(test.createdBy)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{test.questionCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={test.published ? 'success' : 'warning'}>
                      {test.published ? 'Опубликован' : 'Черновик'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/tests/${test.id}/view`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Просмотреть
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">В этом банке пока нет тестов</p>
      )}
    </div>
  )
}
