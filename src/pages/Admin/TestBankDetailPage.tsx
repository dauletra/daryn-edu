import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTestBank, getTestsByBank, getUsers, updateTest, deleteTest } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { formatTestTitle } from '@/utils/testTitle'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Test } from '@/types'

export function TestBankDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { showSuccess, showError } = useToast()
  const { data: bank, loading: loadingBank } = useFirestoreQuery(
    () => getTestBank(id!),
    [id]
  )
  const { data: tests, loading: loadingTests, refetch } = useFirestoreQuery(
    () => getTestsByBank(id!),
    [id]
  )
  const { data: moderators, loading: loadingModerators } = useFirestoreQuery(() => getUsers('moderator'))

  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)

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
                  <td className="px-4 py-3 text-sm text-gray-900">{formatTestTitle(test)}</td>
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
        <p className="text-gray-500 text-center py-8">В этом банке пока нет тестов</p>
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
