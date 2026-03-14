import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTests, getUsers, getTestBanks, updateTest, deleteTest } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { formatTestTitle } from '@/utils/testTitle'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Test } from '@/types'

export function AdminTestsPage() {
  const { data: tests, loading: loadingTests, refetch } = useFirestoreQuery(() => getTests())
  const { data: moderators, loading: loadingModerators } = useFirestoreQuery(() => getUsers('moderator'))
  const { data: testBanks, loading: loadingBanks } = useFirestoreQuery(() => getTestBanks())
  const { showSuccess, showError } = useToast()

  const [filterBankId, setFilterBankId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)

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

  const handlePublishToggle = async (test: Test) => {
    setSubmitting(true)
    try {
      await updateTest(test.id, { published: !test.published })
      showSuccess(test.published ? 'Тест снят с публикации' : 'Тест опубликован')
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setSubmitting(true)
    try {
      await deleteTest(confirmDelete.id)
      showSuccess('Тест удалён')
      setConfirmDelete(null)
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка удаления')
    } finally {
      setSubmitting(false)
    }
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
                  <td className="px-4 py-3 text-sm text-gray-900">{formatTestTitle(test)}</td>
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
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/admin/tests/${test.id}/view`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Просмотреть
                      </Link>
                      <button
                        onClick={() => void handlePublishToggle(test)}
                        disabled={submitting}
                        className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 cursor-pointer"
                      >
                        {test.published ? 'Снять' : 'Опубликовать'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: test.id, title: formatTestTitle(test) })}
                        disabled={submitting}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-40 cursor-pointer"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Тестов пока нет</p>
      )}

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Удалить тест?">
        <p className="text-sm text-gray-600 mb-4">
          Тест <strong>{confirmDelete?.title}</strong> будет удалён вместе со всеми вопросами. Это действие нельзя отменить.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Отмена</Button>
          <Button variant="danger" isLoading={submitting} onClick={() => void handleDeleteConfirm()}>Удалить</Button>
        </div>
      </Modal>
    </div>
  )
}
