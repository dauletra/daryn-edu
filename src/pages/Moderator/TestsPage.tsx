import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTestsByCreator, updateTest, deleteTest, getQuestionsCount, getClasses, getTestBanks } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'

export function TestsPage() {
  const { user } = useAuth()
  const { data: tests, loading, refetch } = useFirestoreQuery(
    () => getTestsByCreator(user!.uid),
    [user?.uid]
  )
  const { data: classes } = useFirestoreQuery(() => getClasses())
  const { data: testBanks } = useFirestoreQuery(() => getTestBanks())
  const { showSuccess, showError } = useToast()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const isTestAssigned = (testId: string) => {
    if (!classes) return false
    return classes.some((cls) => cls.assignedTests?.includes(testId))
  }
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

  const getBankName = (bankId: string) => {
    const bank = testBanks?.find((b) => b.id === bankId)
    return bank?.name ?? 'Без банка'
  }

  const groupedTests = useMemo(() => {
    if (!tests) return []
    const groups = new Map<string, typeof tests>()
    for (const test of tests) {
      const bankId = test.testBankId || '__none__'
      if (!groups.has(bankId)) groups.set(bankId, [])
      groups.get(bankId)!.push(test)
    }
    return Array.from(groups.entries()).map(([bankId, bankTests]) => ({
      bankId,
      bankName: bankId === '__none__' ? 'Без банка' : getBankName(bankId),
      tests: bankTests,
    }))
  }, [tests, testBanks])

  if (loading) return <LoadingSpinner />
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мои тесты</h1>
        <Link to="/moderator/tests/new">
          <Button>Создать тест</Button>
        </Link>
      </div>

      {tests && tests.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groupedTests.map((group) => (
            <div key={group.bankId}>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">{group.bankName}</h2>
              <div className="grid grid-cols-1 gap-4">
                {group.tests.map((test) => (
                  <div key={test.id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{test.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{test.subject}</p>
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
                      <div className="flex items-center gap-2">
                        {test.published ? (
                          <>
                            <Button variant="secondary" className="text-xs" onClick={() => handlePublish(test.id, false)}>
                              Снять
                            </Button>
                            <Link to={`/moderator/tests/${test.id}/view`}>
                              <Button variant="secondary" className="text-xs">Просмотреть</Button>
                            </Link>
                          </>
                        ) : (
                          <Button variant="secondary" className="text-xs" onClick={() => handlePublish(test.id, true)}>
                            Опубликовать
                          </Button>
                        )}
                        {!test.published && (
                          <Link to={`/moderator/tests/${test.id}/edit`}>
                            <Button variant="secondary" className="text-xs">Редактировать</Button>
                          </Link>
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
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">У вас ещё нет тестов</p>
          <Link to="/moderator/tests/new">
            <Button>Создать первый тест</Button>
          </Link>
        </div>
      )}

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Удалить тест?"
      >
        <p className="text-sm text-gray-600 mb-4">Это действие нельзя отменить. Все вопросы теста будут удалены.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Отмена</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Удалить</Button>
        </div>
      </Modal>
    </div>
  )
}
