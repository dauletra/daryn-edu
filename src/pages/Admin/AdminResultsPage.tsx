import { useState, useMemo } from 'react'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getClasses, getUsers, getTests, getAllResults, getResultsByClass, getQuestionsByIds } from '@/services/db'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { MathText } from '@/components/ui/MathText'
import type { TestResult, Question } from '@/types'

const CURRENT_YEAR = new Date().getFullYear()
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

export function AdminResultsPage() {
  const { data: classes } = useFirestoreQuery(() => getClasses())
  const { data: students } = useFirestoreQuery(() => getUsers('student'))
  const { data: tests } = useFirestoreQuery(() => getTests())

  const [filterClassId, setFilterClassId] = useState('')
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR)
  const [filterQuarter, setFilterQuarter] = useState('')
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null)
  const [expandedQuestions, setExpandedQuestions] = useState<Question[]>([])

  const { data: results, loading: loadingResults } = useFirestoreQuery(
    () => filterClassId ? getResultsByClass(filterClassId) : getAllResults(),
    [filterClassId]
  )

  const filteredResults = useMemo(() => {
    if (!results) return []
    return results
      .filter((r) => {
        if (filterQuarter && r.quarter !== `${filterYear}-${filterQuarter}`) return false
        if (!filterQuarter && r.year !== filterYear) return false
        return true
      })
      .sort((a, b) => b.score - a.score)
  }, [results, filterYear, filterQuarter])

  const stats = useMemo(() => {
    if (filteredResults.length === 0) return null
    const scores = filteredResults.map((r) => r.score)
    return {
      count: filteredResults.length,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      max: Math.max(...scores),
      min: Math.min(...scores),
    }
  }, [filteredResults])

  const getStudentName = (uid: string) => students?.find((s) => s.uid === uid)?.name ?? uid
  const getTestTitle = (testId: string) => tests?.find((t) => t.id === testId)?.title ?? testId

  const handleExpandResult = async (result: TestResult) => {
    if (expandedResultId === result.id) {
      setExpandedResultId(null)
      return
    }
    setExpandedResultId(result.id)
    const qs = await getQuestionsByIds(result.testId, result.questionIds)
    setExpandedQuestions(qs)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Результаты</h1>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Класс:</label>
          <select
            value={filterClassId}
            onChange={(e) => { setFilterClassId(e.target.value); setExpandedResultId(null) }}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Все классы</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Год:</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Четверть:</label>
          <select
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Все</option>
            {QUARTERS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingResults ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{stats.count}</div>
                <div className="text-xs text-gray-500">Сдали</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{stats.avg}%</div>
                <div className="text-xs text-gray-500">Средний балл</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-green-600">{stats.max}%</div>
                <div className="text-xs text-gray-500">Лучший</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-red-600">{stats.min}%</div>
                <div className="text-xs text-gray-500">Худший</div>
              </div>
            </div>
          )}

          {/* Results table */}
          {filteredResults.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Ученик</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Тест</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Четверть</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Результат</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Ошибки</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResults.map((result) => (
                    <tr key={result.id}>
                      <td colSpan={5} className="p-0">
                        <div
                          className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center"
                          onClick={() => handleExpandResult(result)}
                        >
                          <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                            <span className="text-sm text-gray-900">{getStudentName(result.studentId)}</span>
                            <span className="text-sm text-gray-700">{getTestTitle(result.testId)}</span>
                            <span className="text-sm text-gray-500">{result.quarter}</span>
                            <span className="text-sm">
                              <Badge variant={result.score >= 70 ? 'success' : result.score >= 50 ? 'warning' : 'danger'}>
                                {result.correctCount} из {result.questionIds.length} &middot; {result.score}%
                              </Badge>
                            </span>
                            <span className="text-sm text-gray-500">
                              {result.wrongQuestionIds.length} ошибок
                            </span>
                          </div>
                          <span className="text-gray-400 ml-2">
                            {expandedResultId === result.id ? '\u25B2' : '\u25BC'}
                          </span>
                        </div>

                        {/* Expanded detail */}
                        {expandedResultId === result.id && expandedQuestions.length > 0 && (
                          <div className="px-4 pb-4 bg-gray-50">
                            <div className="flex flex-col gap-2">
                              {result.questionIds.map((qId) => {
                                const question = expandedQuestions.find((q) => q.id === qId)
                                const answer = result.answers.find((a) => a.questionId === qId)
                                if (!question) return null
                                const isCorrect = answer?.correct ?? false

                                return (
                                  <div
                                    key={qId}
                                    className={`p-3 rounded-lg text-sm ${
                                      isCorrect ? 'bg-green-50' : 'bg-red-50'
                                    }`}
                                  >
                                    <p className="font-medium text-gray-900 mb-1"><MathText text={question.text} /></p>
                                    <div className="flex gap-4 flex-wrap">
                                      <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                                        Ответ ученика: {answer && answer.selectedIndex >= 0
                                          ? <>{String.fromCharCode(65 + answer.selectedIndex)}. <MathText text={question.options[answer.selectedIndex]} /></>
                                          : 'Без ответа'}
                                      </span>
                                      {!isCorrect && (
                                        <span className="text-green-700">
                                          Правильный: {String.fromCharCode(65 + question.correctIndex)}. <MathText text={question.options[question.correctIndex]} />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Нет результатов за выбранный период</p>
          )}
        </>
      )}
    </div>
  )
}
