import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTest, getQuestions, openTestAccess, closeTestAccess } from '@/services/db'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MathText } from '@/components/ui/MathText'
import { useToast } from '@/context/ToastContext'

interface TestViewPageProps {
  backTo: string
  backLabel: string
}

export function TestViewPage({ backTo, backLabel }: TestViewPageProps) {
  const { id: testId } = useParams<{ id: string }>()
  const { showSuccess, showError } = useToast()
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadingAccess, setLoadingAccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: test, loading: loadingTest } = useFirestoreQuery(
    () => getTest(testId!),
    [testId, refreshKey],
  )
  const { data: questions, loading: loadingQuestions } = useFirestoreQuery(
    () => getQuestions(testId!),
    [testId],
  )

  if (loadingTest || loadingQuestions) return <LoadingSpinner />
  if (!test) return <p className="text-gray-500">Тест табылмады</p>

  const bankCount = questions?.length ?? 0
  const shareUrl = `${window.location.origin}/open-test/${testId}`

  async function handleOpenAccess() {
    setLoadingAccess(true)
    try {
      await openTestAccess(testId!)
      setRefreshKey((k) => k + 1)
      showSuccess('Қол жеткізу ашылды')
    } catch {
      showError('Қол жеткізуді ашу қатесі')
    } finally {
      setLoadingAccess(false)
    }
  }

  async function handleCloseAccess() {
    setLoadingAccess(true)
    try {
      await closeTestAccess(testId!)
      setRefreshKey((k) => k + 1)
      showSuccess('Қол жеткізу жабылды')
    } catch {
      showError('Қол жеткізуді жабу қатесі')
    } finally {
      setLoadingAccess(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to={backTo} className="text-sm text-blue-600 hover:text-blue-800">
          &larr; {backLabel}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{test.title}</h1>
        <p className="text-sm text-gray-500">
          {test.subject} &middot; {test.timeLimit} мин &middot; оқушыға {test.questionCount} сұрақ
        </p>
        <div className="mt-2">
          <Badge variant={test.published ? 'success' : 'warning'}>
            {test.published ? 'Жарияланған' : 'Жоба'}
          </Badge>
        </div>
      </div>

      {/* Share access block — only for published tests */}
      {test.published && (
        <div className="mb-4">
          {!test.shareToken ? (
            <Button
              variant="primary"
              isLoading={loadingAccess}
              onClick={handleOpenAccess}
            >
              Жауаптарға қол жеткізуді ашу
            </Button>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-green-800 mb-1">Қол жеткізу ашылды — тестті қарауға арналған сілтеме</p>
              <p className="text-sm text-green-700 break-all mb-2">{shareUrl}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? 'Көшірілді!' : 'Сілтемені көшіру'}
                </Button>
                <Button variant="danger" isLoading={loadingAccess} onClick={handleCloseAccess}>
                  Қол жеткізуді жабу
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bank counter */}
      <div className="bg-blue-50 rounded-lg px-4 py-3 mb-4 text-sm text-blue-700">
        Банкте: <strong>{bankCount}</strong> сұрақ, оқушы алады: <strong>{test.questionCount}</strong>
      </div>

      {/* Questions list (read-only) */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Сұрақтар банкі</h2>

      {questions && questions.length > 0 ? (
        <div className="flex flex-col gap-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm font-medium text-gray-900">
                <span className="text-gray-400 mr-2">#{idx + 1}</span>
                <MathText text={q.text} />
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {q.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`text-sm px-2 py-1 rounded ${
                      i === q.correctIndex
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'text-gray-600'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. <MathText text={opt} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">Сұрақтар әлі жоқ.</p>
      )}
    </div>
  )
}
