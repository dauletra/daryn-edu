import { Link } from 'react-router-dom'
import { formatTestTitle } from '@/utils/testTitle'
import { useAuth } from '@/hooks/useAuth'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTestsByBank, updateTest, deleteTest, getQuestionsCount, getClasses, getUsers } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { useBank } from '@/context/BankContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { useState, useMemo } from 'react'

export function TestsPage() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const { selectedBankId, selectedBank, banks, loading: loadingBanks } = useBank()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: tests, loading: loadingTests, refetch } = useFirestoreQuery(
    () => selectedBankId ? getTestsByBank(selectedBankId) : Promise.resolve([]),
    [selectedBankId]
  )
  const { data: classes } = useFirestoreQuery(() => getClasses())
  const { data: moderators } = useFirestoreQuery(() => getUsers('moderator'))

  const myTests = useMemo(() => tests?.filter((t) => t.createdBy === user?.uid) ?? [], [tests, user?.uid])
  const colleagueTests = useMemo(() => tests?.filter((t) => t.createdBy !== user?.uid) ?? [], [tests, user?.uid])

  const getModeratorName = (uid: string) => moderators?.find((m) => m.uid === uid)?.name ?? '—'

  const isTestAssigned = (testId: string) => classes?.some((cls) => cls.assignedTests?.includes(testId)) ?? false

  const handlePublish = async (testId: string, publish: boolean) => {
    try {
      if (publish) {
        const count = await getQuestionsCount(testId)
        const test = tests?.find((t) => t.id === testId)
        if (test && test.questionCount > count) {
          showError(`Недостаточно вопросов в банке. В банке: ${count}, требуется: ${test.questionCount}`)
          return
        }
      }
      await updateTest(testId, { published: publish })
      showSuccess(publish ? 'Тест опубликован' : 'Тест снят с публикации')
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка')
    }
  }

  const handleDelete = async (testId: string) => {
    try {
      await deleteTest(testId)
      showSuccess('Тест удалён')
      setConfirmDelete(null)
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка удаления')
    }
  }

  if (loadingBanks) return <LoadingSpinner />

  if (banks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Банки тестов ещё не созданы.</p>
        <p className="text-sm text-gray-400 mt-1">Обратитесь к администратору.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Тесты</h1>
        {selectedBankId && (
          <Link to={`/moderator/tests/new?bankId=${selectedBankId}`}>
            <Button>Создать тест</Button>
          </Link>
        )}
      </div>

      {selectedBankId && (
        <>
          {selectedBank && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center gap-6">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Банк тестов</div>
                <div className="font-semibold text-gray-900">{selectedBank.name}</div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Четверть</div>
                <div className="font-semibold text-gray-900">{selectedBank.quarter}</div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Учебный год</div>
                <div className="font-semibold text-gray-900">{selectedBank.academicYear}-{selectedBank.academicYear + 1}</div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Всего тестов</div>
                <div className="font-semibold text-gray-900">{tests?.length ?? 0}</div>
              </div>
            </div>
          )}

          {loadingTests ? (
            <LoadingSpinner />
          ) : (
            <div className="flex flex-col gap-8">
              <section>
                <h2 className="text-base font-semibold text-gray-700 mb-3">
                  Мои тесты <span className="text-gray-400 font-normal">({myTests.length})</span>
                </h2>
                {myTests.length === 0 ? (
                  <p className="text-gray-400 text-sm">У вас нет тестов в этом банке</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {myTests.map((test) => (
                      <div key={test.id} className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{formatTestTitle(test)}</h3>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span>Вопросов для ученика: {test.questionCount}</span>
                              <span>Время: {test.timeLimit} мин</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={test.published ? 'success' : 'warning'}>
                                {test.published ? 'Опубликован' : 'Черновик'}
                              </Badge>
                              {test.published && !isTestAssigned(test.id) && (
                                <Badge variant="danger">Не назначен ни одному классу</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {!test.published && (
                              <Link to={`/moderator/tests/${test.id}/edit`}>
                                <Button variant="secondary" className="text-xs">Редактировать</Button>
                              </Link>
                            )}
                            {test.published ? (
                              <>
                                <Button variant="secondary" className="text-xs" onClick={() => void handlePublish(test.id, false)}>
                                  Снять
                                </Button>
                                <Link to={`/moderator/tests/${test.id}/view`}>
                                  <Button variant="secondary" className="text-xs">Просмотреть</Button>
                                </Link>
                              </>
                            ) : (
                              <Button variant="secondary" className="text-xs" onClick={() => void handlePublish(test.id, true)}>
                                Опубликовать
                              </Button>
                            )}
                            <Link to={`/moderator/tests/${test.id}/results`}>
                              <Button variant="secondary" className="text-xs">Результаты</Button>
                            </Link>
                            {!test.published && (
                              <Button variant="danger" className="text-xs" onClick={() => setConfirmDelete(test.id)}>
                                Удалить
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-700 mb-3">
                  Тесты коллег <span className="text-gray-400 font-normal">({colleagueTests.length})</span>
                </h2>
                {colleagueTests.length === 0 ? (
                  <p className="text-gray-400 text-sm">Нет тестов других модераторов в этом банке</p>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Название</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Предмет</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Автор</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Статус</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {colleagueTests.map((test) => (
                          <tr key={test.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{formatTestTitle(test)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{test.subject}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{getModeratorName(test.createdBy)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={test.published ? 'success' : 'warning'}>
                                {test.published ? 'Опубликован' : 'Черновик'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                to={`/moderator/tests/${test.id}/view`}
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
                )}
              </section>
            </div>
          )}
        </>
      )}

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Удалить тест?">
        <p className="text-sm text-gray-600 mb-4">Это действие нельзя отменить. Все вопросы теста будут удалены.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Отмена</Button>
          <Button variant="danger" onClick={() => confirmDelete && void handleDelete(confirmDelete)}>Удалить</Button>
        </div>
      </Modal>
    </div>
  )
}
