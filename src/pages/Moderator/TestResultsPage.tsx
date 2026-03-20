import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTest, getResultsByTest, getUsers, getQuestionsByIds, resetStudentTestAccess, markStudentAbsence, getAbsencesByTest } from '@/services/db'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/context/ToastContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { getScoreVariant } from '@/utils/scoreUtils'
import { formatDuration } from '@/utils/timeUtils'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { MathText } from '@/components/ui/MathText'
import type { TestResult, Question } from '@/types'

const CURRENT_YEAR = new Date().getFullYear()
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

export function TestResultsPage() {
  const { id: testId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const { data: test, loading: loadingTest } = useFirestoreQuery(() => getTest(testId!), [testId])
  const { data: results, loading: loadingResults, refetch: refetchResults } = useFirestoreQuery(
    () => getResultsByTest(testId!),
    [testId]
  )
  const { data: students, loading: loadingStudents } = useFirestoreQuery(() => getUsers('student'))
  const { data: absences, refetch: refetchAbsences } = useFirestoreQuery(
    () => getAbsencesByTest(testId!),
    [testId]
  )

  const [filterYear, setFilterYear] = useState(CURRENT_YEAR)
  const [filterQuarter, setFilterQuarter] = useState('')
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null)
  const [expandedQuestions, setExpandedQuestions] = useState<Question[]>([])
  const [confirmReset, setConfirmReset] = useState<{ studentId: string; studentName: string } | null>(null)
  const [absenceModal, setAbsenceModal] = useState<{ studentId: string; studentName: string } | null>(null)
  const [absenceReason, setAbsenceReason] = useState('')

  const filteredResults = useMemo(() => {
    if (!results) return []
    return results
      .filter((r) => r.status === 'completed')
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

  const getStudentName = (uid: string) => {
    return students?.find((s) => s.uid === uid)?.name ?? uid
  }

  const handleExpandResult = async (result: TestResult) => {
    if (expandedResultId === result.id) {
      setExpandedResultId(null)
      return
    }
    setExpandedResultId(result.id)
    if (testId) {
      const qs = await getQuestionsByIds(testId, result.questionIds)
      setExpandedQuestions(qs)
    }
  }

  const handleResetAccess = async () => {
    if (!confirmReset || !testId) return
    try {
      await resetStudentTestAccess(confirmReset.studentId, testId)
      showSuccess(`${confirmReset.studentName} үшін тестке қол жеткізу қайта орнатылды`)
      setConfirmReset(null)
      refetchResults()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Қайта орнату қатесі')
    }
  }

  const handleMarkAbsence = async () => {
    if (!absenceModal || !testId || !user) return
    if (!absenceReason.trim()) {
      showError('Себебін көрсетіңіз')
      return
    }
    try {
      const student = students?.find((s) => s.uid === absenceModal.studentId)
      await markStudentAbsence({
        studentId: absenceModal.studentId,
        classId: student?.classId || '',
        testId,
        reason: absenceReason.trim(),
        markedBy: user.uid,
      })
      showSuccess(`${absenceModal.studentName} болмағаны белгіленді`)
      setAbsenceModal(null)
      setAbsenceReason('')
      refetchAbsences()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Қате')
    }
  }

  if (loadingTest || loadingResults || loadingStudents) return <LoadingSpinner />
  if (!test) return <p className="text-gray-500">Тест табылмады</p>

  return (
    <div>
      <Link to="/moderator/tests" className="text-sm text-blue-600 hover:text-blue-800">
        &larr; Тесттерге оралу
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-2">{test.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{test.subject}</p>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Жыл:</label>
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
          <label className="text-sm text-gray-600">Тоқсан:</label>
          <select
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Барлығы</option>
            {QUARTERS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.count}</div>
            <div className="text-xs text-gray-500">Тапсырды</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.avg}%</div>
            <div className="text-xs text-gray-500">Орташа балл</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.max}%</div>
            <div className="text-xs text-gray-500">Үздік</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-red-600">{stats.min}%</div>
            <div className="text-xs text-gray-500">Ең төмен</div>
          </div>
        </div>
      )}

      {/* Absences */}
      {absences && absences.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Болмағандар</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Оқушы</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Себебі</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {absences.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{getStudentName(a.studentId)}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results table */}
      {filteredResults.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Оқушы</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Тоқсан</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Нәтиже</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Қателер</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Уақыты</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Әрекеттер</th>
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
                      <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                        <span className="text-sm text-gray-900">{getStudentName(result.studentId)}</span>
                        <span className="text-sm text-gray-500">{result.quarter}</span>
                        <span className="text-sm">
                          <Badge variant={getScoreVariant(result.score)}>
                            {result.correctCount} / {result.questionIds.length} &middot; {result.score}%
                          </Badge>
                        </span>
                        <span className="text-sm text-gray-500">
                          {result.wrongQuestionIds.length} қате
                        </span>
                        <span className="text-sm text-gray-500">
                          {result.submittedAt && result.startedAt
                            ? formatDuration(result.startedAt, result.submittedAt)
                            : '—'}
                        </span>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setConfirmReset({ studentId: result.studentId, studentName: getStudentName(result.studentId) })}
                            className="text-xs text-orange-600 hover:text-orange-800 cursor-pointer"
                          >
                            Қайта орнату
                          </button>
                          <button
                            onClick={() => setAbsenceModal({ studentId: result.studentId, studentName: getStudentName(result.studentId) })}
                            className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer ml-2"
                          >
                            Болмаған
                          </button>
                        </div>
                      </div>
                      <span className="text-gray-400 ml-2">
                        {expandedResultId === result.id ? '▲' : '▼'}
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

                            // Show everything in the student's shuffled view context
                            const shuffledQ = result.shuffledQuestions?.find((q) => q.id === qId)
                            const oMap = result.optionsMap?.[qId]
                            const selectedIdx = answer?.selectedIndex ?? -1
                            // Find which shuffled position the correct answer ended up at
                            const correctShuffledPos = oMap
                              ? oMap.indexOf(question.correctIndex)
                              : question.correctIndex
                            const safeCorrectPos = correctShuffledPos >= 0 ? correctShuffledPos : question.correctIndex

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
                                    Оқушы жауабы: {selectedIdx >= 0
                                      ? <>{String.fromCharCode(65 + selectedIdx)}. <MathText text={shuffledQ?.options[selectedIdx] ?? question.options[selectedIdx]} /></>
                                      : 'Жауапсыз'}
                                  </span>
                                  {!isCorrect && (
                                    <span className="text-green-700">
                                      Дұрыс: {String.fromCharCode(65 + safeCorrectPos)}. <MathText text={shuffledQ?.options[safeCorrectPos] ?? question.options[question.correctIndex]} />
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
        <p className="text-gray-500 text-center py-8">Бұл тестті әлі ешкім тапсырмады</p>
      )}

      {/* Reset confirmation modal */}
      <Modal isOpen={!!confirmReset} onClose={() => setConfirmReset(null)} title="Тестке қол жеткізуді қайта орнату керек пе?">
        <p className="text-sm text-gray-600 mb-4">
          <strong>{confirmReset?.studentName}</strong> үшін тест нәтижесі жойылады және оқушы тестті қайта өте алады.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(null)}>Болдырмау</Button>
          <Button variant="danger" onClick={handleResetAccess}>Қайта орнату</Button>
        </div>
      </Modal>

      {/* Absence modal */}
      <Modal isOpen={!!absenceModal} onClose={() => { setAbsenceModal(null); setAbsenceReason('') }} title="Болмағанды белгілеу">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Оқушы: <strong>{absenceModal?.studentName}</strong>
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700">Себебі</label>
            <textarea
              value={absenceReason}
              onChange={(e) => setAbsenceReason(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Болмау себебін көрсетіңіз..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setAbsenceModal(null); setAbsenceReason('') }}>Болдырмау</Button>
            <Button onClick={handleMarkAbsence}>Белгілеу</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
