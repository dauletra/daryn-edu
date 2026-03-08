import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getAssignedTests, getResult } from '@/services/db'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useState, useEffect } from 'react'
import type { TestResult, Test } from '@/types'

interface TestWithStatus {
  test: Test
  result: TestResult | null
}

export function StudentTestsPage() {
  const { user } = useAuth()
  const hasClassId = Boolean(user?.classId)
  const { data: assigned, loading, error, refetch } = useFirestoreQuery(
    () => hasClassId ? getAssignedTests(user!.classId!) : Promise.resolve([]),
    [user?.classId]
  )
  const [testsWithStatus, setTestsWithStatus] = useState<TestWithStatus[]>([])
  const [loadingResults, setLoadingResults] = useState(false)

  useEffect(() => {
    if (!assigned || !user) return
    setLoadingResults(true)
    Promise.all(
      assigned.map(async (test) => {
        const result = await getResult(user.uid, test.id)
        return { test, result }
      })
    )
      .then(setTestsWithStatus)
      .finally(() => setLoadingResults(false))
  }, [assigned, user])

  if (!user?.classId) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Мои тесты</h1>
        <p className="text-gray-500">Вы не прикреплены к классу. Обратитесь к администратору.</p>
      </div>
    )
  }

  if (loading || loadingResults) return <LoadingSpinner />

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Мои тесты</h1>
        <p className="text-red-600 mb-4">Ошибка загрузки тестов: {error}</p>
        <Button onClick={refetch}>Попробовать снова</Button>
      </div>
    )
  }

  if (testsWithStatus.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Мои тесты</h1>
        <p className="text-gray-500">Тестов пока нет. Ожидайте назначения.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Мои тесты</h1>
      <div className="flex flex-col gap-3">
        {testsWithStatus.map(({ test, result }) => {
          const status = !result
            ? 'not_started'
            : result.status === 'in_progress'
            ? 'in_progress'
            : 'completed'

          return (
            <div key={test.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{test.title.replace(/ - Вариант \d+$/, '')}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {test.subject} &middot; {test.timeLimit} мин &middot; {test.questionCount} вопросов
                  </p>
                  <div className="mt-2">
                    {status === 'not_started' && <Badge variant="info">Не начат</Badge>}
                    {status === 'in_progress' && <Badge variant="warning">В процессе</Badge>}
                    {status === 'completed' && (
                      <Badge variant="success">
                        Завершён ({result!.score}%)
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  {status === 'not_started' && (
                    <Link to={`/student/tests/${test.id}/take`}>
                      <Button>Начать</Button>
                    </Link>
                  )}
                  {status === 'in_progress' && (
                    <Link to={`/student/tests/${test.id}/take`} state={{ resume: true }}>
                      <Button variant="secondary">Продолжить</Button>
                    </Link>
                  )}
                  {status === 'completed' && (
                    <span className="text-2xl font-bold text-gray-700">
                      {result!.correctCount}/{test.questionCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
