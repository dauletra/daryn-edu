import { useState, useMemo } from 'react'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getClasses, getUsers, getTestBanks, getResultsByBank } from '@/services/db'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { exportClassResults } from './exportClassResults'
import { getGrade, getScoreColor, getGradeColor } from '@/utils/scoreUtils'
import type { TestResult, AppUser } from '@/types'

export function AdminResultsPage() {
  const { data: testBanks, loading: loadingBanks } = useFirestoreQuery(() => getTestBanks())
  const { data: classes, loading: loadingClasses } = useFirestoreQuery(() => getClasses())
  const { data: students, loading: loadingStudents } = useFirestoreQuery(() => getUsers('student'))
  const [selectedBankId, setSelectedBankId] = useState('')
  const [filterClassId, setFilterClassId] = useState('')
  const [filterSubjectId, setFilterSubjectId] = useState('')

  const { data: bankResults, loading: loadingResults } = useFirestoreQuery(
    () => selectedBankId ? getResultsByBank(selectedBankId) : Promise.resolve([]),
    [selectedBankId]
  )

  const selectedBank = useMemo(
    () => testBanks?.find((b) => b.id === selectedBankId) ?? null,
    [testBanks, selectedBankId]
  )

  const selectedClass = useMemo(
    () => classes?.find((c) => c.id === filterClassId) ?? null,
    [classes, filterClassId]
  )

  const handleBankChange = (bankId: string) => {
    setSelectedBankId(bankId)
    setFilterClassId('')
    setFilterSubjectId('')
  }

  const handleClassChange = (classId: string) => {
    setFilterClassId(classId)
    setFilterSubjectId('')
  }

  // Subjects that actually have results in the selected bank+class
  const activeSubjects = useMemo(() => {
    if (!bankResults || !filterClassId) return []
    const classResults = bankResults.filter((r) => r.classId === filterClassId)
    const seen = new Map<string, string>()
    for (const r of classResults) {
      if (!seen.has(r.subjectId)) seen.set(r.subjectId, r.subject)
    }
    return Array.from(seen.entries())
      .map(([subjectId, subjectName]) => ({ subjectId, subjectName }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
  }, [bankResults, filterClassId])

  // Students belonging to the selected class
  const classStudents = useMemo(() => {
    if (!students || !filterClassId) return []
    return students.filter((s) => s.classId === filterClassId)
  }, [students, filterClassId])

  if (loadingBanks || loadingClasses || loadingStudents) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Результаты</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Bank selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Банк тестов:</label>
          <select
            value={selectedBankId}
            onChange={(e) => handleBankChange(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Выберите банк</option>
            {testBanks?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.academicYear}, {b.quarter} четв.)
              </option>
            ))}
          </select>
          {selectedBank && (
            <span className="text-sm text-gray-400">
              {selectedBank.academicYear}–{selectedBank.academicYear + 1}, четверть {selectedBank.quarter}
            </span>
          )}
        </div>

        {/* Class selector */}
        {selectedBankId && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Класс:</label>
            <select
              value={filterClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Выберите класс</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Subject selector */}
        {filterClassId && activeSubjects.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Предмет:</label>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Все предметы</option>
              {activeSubjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Export button */}
        {filterClassId && selectedBank && !loadingResults && activeSubjects.length > 0 && (
          <button
            onClick={() => void exportClassResults({
              bank: selectedBank,
              className: selectedClass?.name ?? filterClassId,
              classStudents,
              bankResults: bankResults ?? [],
              classId: filterClassId,
              activeSubjects,
            })}
            className="ml-auto px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Экспорт в Excel
          </button>
        )}
      </div>

      {/* Content area */}
      {!selectedBankId ? (
        <p className="text-gray-500 text-center py-12">Выберите банк тестов для просмотра результатов</p>
      ) : loadingResults ? (
        <LoadingSpinner />
      ) : !filterClassId ? (
        <p className="text-gray-500 text-center py-12">Выберите класс для просмотра результатов</p>
      ) : filterSubjectId ? (
        <SubjectView
          bankResults={bankResults ?? []}
          classId={filterClassId}
          subjectId={filterSubjectId}
          className={selectedClass?.name ?? filterClassId}
          classStudents={classStudents}
        />
      ) : (
        <ClassView
          bankResults={bankResults ?? []}
          classId={filterClassId}
          activeSubjects={activeSubjects}
          classStudents={classStudents}
        />
      )}
    </div>
  )
}

// ─── View 1: Cross-subject table ────────────────────────────────────────────

interface SubjectMeta { subjectId: string; subjectName: string }

interface ClassViewProps {
  bankResults: TestResult[]
  classId: string
  activeSubjects: SubjectMeta[]
  classStudents: AppUser[]
}

function ClassView({ bankResults, classId, activeSubjects, classStudents }: ClassViewProps) {
  const classResults = useMemo(
    () => bankResults.filter((r) => r.classId === classId),
    [bankResults, classId]
  )

  // Map: studentId → subjectId → TestResult
  const resultMap = useMemo(() => {
    const map = new Map<string, Map<string, TestResult>>()
    for (const r of classResults) {
      if (!map.has(r.studentId)) map.set(r.studentId, new Map())
      map.get(r.studentId)!.set(r.subjectId, r)
    }
    return map
  }, [classResults])

  // Max question count per subject (for header label)
  const subjectTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of classResults) {
      const cur = map.get(r.subjectId) ?? 0
      map.set(r.subjectId, Math.max(cur, r.questionIds.length))
    }
    return map
  }, [classResults])

  const rows = useMemo(() => {
    return classStudents
      .map((student) => {
        const bySubject = resultMap.get(student.uid) ?? new Map<string, TestResult>()
        let totalCorrect = 0
        let totalQuestions = 0
        for (const r of bySubject.values()) {
          totalCorrect += r.correctCount
          totalQuestions += r.questionIds.length
        }
        const totalPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null
        return { student, bySubject, totalCorrect, totalQuestions, totalPct }
      })
      .sort((a, b) => (b.totalPct ?? -1) - (a.totalPct ?? -1))
  }, [classStudents, resultMap])

  if (rows.length === 0) {
    return <p className="text-gray-500 text-center py-8">Нет данных для выбранного класса</p>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-center px-3 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">#</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Ученик</th>
            {activeSubjects.map((s) => (
              <th key={s.subjectId} className="text-center px-3 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">
                {s.subjectName}
                {subjectTotals.has(s.subjectId) && (
                  <span className="text-gray-400 font-normal"> [{subjectTotals.get(s.subjectId)}]</span>
                )}
              </th>
            ))}
            <th className="text-center px-3 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Итого</th>
            <th className="text-center px-3 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ student, bySubject, totalCorrect, totalQuestions, totalPct }, i) => (
            <tr key={student.uid} className="hover:bg-gray-50">
              <td className="px-3 py-3 text-sm text-center text-gray-400 whitespace-nowrap">{i + 1}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{student.name}</td>
              {activeSubjects.map((s) => {
                const r = bySubject.get(s.subjectId)
                return (
                  <td key={s.subjectId} className="px-3 py-3 text-sm text-center text-gray-700">
                    {r ? r.correctCount : <span className="text-gray-300">—</span>}
                  </td>
                )
              })}
              <td className="px-3 py-3 text-sm text-center text-gray-700">
                {totalQuestions > 0 ? `${totalCorrect}/${totalQuestions}` : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-3 py-3 text-center">
                {totalPct !== null ? <ScoreBadge score={totalPct} /> : <span className="text-gray-300">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
          <tr>
            <td />
            <td className="px-4 py-3 text-sm font-semibold text-gray-600 whitespace-nowrap">Среднее</td>
            {activeSubjects.map((s) => {
              const scores = rows.map((r) => r.bySubject.get(s.subjectId)?.correctCount).filter((v): v is number => v !== undefined)
              const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null
              return (
                <td key={s.subjectId} className="px-3 py-3 text-sm text-center font-medium text-gray-700">
                  {avg ?? <span className="text-gray-300">—</span>}
                </td>
              )
            })}
            {(() => {
              const withResults = rows.filter((r) => r.totalQuestions > 0)
              const sumCorrect = withResults.reduce((a, r) => a + r.totalCorrect, 0)
              const sumTotal = withResults.reduce((a, r) => a + r.totalQuestions, 0)
              const avgPct = withResults.length > 0
                ? Math.round(withResults.reduce((a, r) => a + (r.totalPct ?? 0), 0) / withResults.length)
                : null
              return (
                <>
                  <td className="px-3 py-3 text-sm text-center font-medium text-gray-700">
                    {sumTotal > 0 ? `${(sumCorrect / withResults.length).toFixed(1)}/${(sumTotal / withResults.length).toFixed(1)}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {avgPct !== null ? <ScoreBadge score={avgPct} /> : <span className="text-gray-300">—</span>}
                  </td>
                </>
              )
            })()}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── View 2: Subject grade list ──────────────────────────────────────────────

interface SubjectViewProps {
  bankResults: TestResult[]
  classId: string
  subjectId: string
  className: string
  classStudents: AppUser[]
}

function SubjectView({ bankResults, classId, subjectId, className, classStudents }: SubjectViewProps) {
  const resultMap = useMemo(() => {
    const map = new Map<string, TestResult>()
    for (const r of bankResults) {
      if (r.classId === classId && r.subjectId === subjectId) {
        map.set(r.studentId, r)
      }
    }
    return map
  }, [bankResults, classId, subjectId])

  const rows = useMemo(() => {
    return classStudents
      .map((student) => ({ student, result: resultMap.get(student.uid) ?? null }))
      .sort((a, b) => (b.result?.score ?? -1) - (a.result?.score ?? -1))
  }, [classStudents, resultMap])

  const subjectTotal = useMemo(() => {
    let max = 0
    for (const r of resultMap.values()) max = Math.max(max, r.questionIds.length)
    return max > 0 ? max : null
  }, [resultMap])

  if (rows.length === 0) {
    return <p className="text-gray-500 text-center py-8">Нет учеников в выбранном классе</p>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-center px-3 py-3 text-sm font-medium text-gray-500">#</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Ученик</th>
            <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Класс</th>
            <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
              Балл{subjectTotal !== null && <span className="text-gray-400 font-normal"> [{subjectTotal}]</span>}
            </th>
            <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">%</th>
            <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Оценка</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ student, result }, i) => (
            <tr key={student.uid} className="hover:bg-gray-50">
              <td className="px-3 py-3 text-sm text-center text-gray-400">{i + 1}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
              <td className="px-4 py-3 text-sm text-center text-gray-600">{className}</td>
              <td className="px-4 py-3 text-sm text-center text-gray-700">
                {result ? result.correctCount : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                {result ? <ScoreBadge score={result.score} /> : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                {result ? <GradeBadge score={result.score} /> : <span className="text-gray-300">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
        {(() => {
          const withResults = rows.filter((r) => r.result !== null)
          if (withResults.length === 0) return null
          const avgScore = Math.round(withResults.reduce((a, r) => a + r.result!.score, 0) / withResults.length)
          const avgGrade = (withResults.reduce((a, r) => a + getGrade(r.result!.score), 0) / withResults.length).toFixed(1)
          const totalCorrect = withResults.reduce((a, r) => a + r.result!.correctCount, 0)
          return (
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td />
                <td className="px-4 py-3 text-sm font-semibold text-gray-600">Среднее</td>
                <td />
                <td className="px-4 py-3 text-sm text-center font-medium text-gray-700">
                  {(totalCorrect / withResults.length).toFixed(1)}
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreBadge score={avgScore} />
                </td>
                <td className="px-4 py-3 text-center font-bold text-sm text-gray-900">
                  {avgGrade}
                </td>
              </tr>
            </tfoot>
          )
        })()}
      </table>
    </div>
  )
}

// ─── Shared UI components ────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${getScoreColor(score)}`}>
      {score}%
    </span>
  )
}

function GradeBadge({ score }: { score: number }) {
  const grade = getGrade(score)
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${getGradeColor(grade)}`}>
      {grade}
    </span>
  )
}
