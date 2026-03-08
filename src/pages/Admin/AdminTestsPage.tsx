import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTests, getUsers, getTestBanks } from '@/services/db'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function AdminTestsPage() {
  const { data: tests, loading: loadingTests } = useFirestoreQuery(() => getTests())
  const { data: moderators, loading: loadingModerators } = useFirestoreQuery(() => getUsers('moderator'))
  const { data: testBanks, loading: loadingBanks } = useFirestoreQuery(() => getTestBanks())

  const [filterBankId, setFilterBankId] = useState('')

  const filteredTests = useMemo(() => {
    if (!tests) return []
    if (!filterBankId) return tests
    return tests.filter((t) => t.testBankId === filterBankId)
  }, [tests, filterBankId])

  if (loadingTests || loadingModerators || loadingBanks) return <LoadingSpinner />

  const getCreatorName = (uid: string) => {
    const mod = moderators?.find((m) => m.uid === uid)
    return mod?.name ?? '—'
  }

  const getBankName = (bankId: string) => {
    const bank = testBanks?.find((b) => b.id === bankId)
    return bank?.name ?? '—'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Тесты</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Банк:</label>
          <select
            value={filterBankId}
            onChange={(e) => setFilterBankId(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Все</option>
            {testBanks?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredTests.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Название</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Банк</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Предмет</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Автор</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Вопросов</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{test.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{test.testBankId ? getBankName(test.testBankId) : '—'}</td>
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
        <p className="text-gray-500">Тестов пока нет</p>
      )}
    </div>
  )
}
