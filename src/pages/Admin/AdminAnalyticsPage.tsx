import { useState, useMemo, useEffect } from 'react'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getClasses, getUsers, getSubjects, getResultsByBank } from '@/services/db'
import { useBank } from '@/context/BankContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { ClassLevel, TestResult } from '@/types'
import { computeOverallStats, groupByClass, groupBySubject } from './analytics/analyticsUtils'
import { getScoreColor, getGradeColor } from '@/utils/scoreUtils'

type Tab = 'classes' | 'subjects'

export function AdminAnalyticsPage() {
  const { data: classes, loading: loadingClasses } = useFirestoreQuery(() => getClasses())
  const { data: students, loading: loadingStudents } = useFirestoreQuery(() => getUsers('student'))
  const { data: subjects, loading: loadingSubjects } = useFirestoreQuery(() => getSubjects())
  const { selectedBankId, loading: loadingBanks } = useBank()

  const [filterClassLevel, setFilterClassLevel] = useState<ClassLevel | ''>('')
  const [filterSubjectId, setFilterSubjectId] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('classes')

  // Reset filters when bank changes
  useEffect(() => {
    setFilterClassLevel('')
    setFilterSubjectId('')
  }, [selectedBankId])

  const { data: bankResults, loading: loadingResults } = useFirestoreQuery(
    () => selectedBankId ? getResultsByBank(selectedBankId) : Promise.resolve([]),
    [selectedBankId]
  )

  // Filter classes by selected grade level
  const filteredClasses = useMemo(() => {
    if (!classes) return []
    if (!filterClassLevel) return classes
    return classes.filter((c) => c.classLevel === filterClassLevel)
  }, [classes, filterClassLevel])

  // Apply client-side filters
  const filteredResults = useMemo(() => {
    if (!bankResults) return []
    return (bankResults as TestResult[]).filter((r) => {
      if (filterClassLevel && r.classLevel !== filterClassLevel) return false
      if (filterSubjectId && r.subjectId !== filterSubjectId) return false
      return true
    })
  }, [bankResults, filterClassLevel, filterSubjectId])

  // Enrolled students matching the parallel filter
  const filteredStudents = useMemo(() => {
    if (!students) return []
    if (!filterClassLevel) return students
    const classIds = new Set(filteredClasses.map((c) => c.id))
    return students.filter((s) => s.classId && classIds.has(s.classId))
  }, [students, filteredClasses, filterClassLevel])

  const overallStats = useMemo(
    () => computeOverallStats(filteredResults, filteredStudents),
    [filteredResults, filteredStudents]
  )

  const classRows = useMemo(
    () => groupByClass(filteredResults, filteredClasses, students ?? []),
    [filteredResults, filteredClasses, students]
  )

  const subjectRows = useMemo(
    () => groupBySubject(filteredResults, students ?? []),
    [filteredResults, students]
  )

  const CLASS_LEVELS: ClassLevel[] = [7, 8, 9, 10, 11]

  if (loadingClasses || loadingStudents || loadingBanks || loadingSubjects) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Аналитика</h1>

      {/* Filters */}
      {selectedBankId && (
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Параллель:</label>
            <select
              value={filterClassLevel}
              onChange={(e) => {
                const level = e.target.value ? (Number(e.target.value) as ClassLevel) : ''
                setFilterClassLevel(level)
              }}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Все</option>
              {CLASS_LEVELS.map((l) => (
                <option key={l} value={l}>{l} класс</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Предмет:</label>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Все</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!selectedBankId ? (
        <p className="text-gray-500 text-center py-12">Выберите банк тестов вверху страницы</p>
      ) : loadingResults ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Overall Stats Cards */}
          {overallStats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">
                  {overallStats.uniqueStudents}
                  {overallStats.enrolledStudents > 0 && (
                    <span className="text-base font-normal text-gray-400"> / {overallStats.enrolledStudents}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">Учеников сдали</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">
                  {overallStats.enrolledStudents > 0
                    ? Math.round(overallStats.uniqueStudents / overallStats.enrolledStudents * 100)
                    : 0}%
                </div>
                <div className="text-xs text-gray-500">Охват учеников</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{overallStats.avgScore}%</div>
                <div className="text-xs text-gray-500">Средний балл</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {([
              { key: 'classes' as Tab, label: 'По классам' },
              { key: 'subjects' as Tab, label: 'По предметам' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-sm font-medium cursor-pointer transition-colors -mb-px ${
                  activeTab === key
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'classes' && (
            classRows.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Класс</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Охват</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Средний балл</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Средняя оценка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {classRows.map((row) => (
                      <tr key={row.classId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.className}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {row.uniqueStudents}
                          {row.enrolledStudents > 0 && (
                            <span className="text-gray-400"> / {row.enrolledStudents}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ScoreBadge score={row.avgScore} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <GradeBadge grade={row.avgGrade} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Нет данных для отображения</p>
            )
          )}

          {activeTab === 'subjects' && (
            subjectRows.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Предмет</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Учеников сдали</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Средний балл</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Средняя оценка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subjectRows.map((row) => (
                      <tr key={row.subjectId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.subjectName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.uniqueStudents}</td>
                        <td className="px-4 py-3 text-center">
                          <ScoreBadge score={row.avgScore} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <GradeBadge grade={row.avgGrade} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Нет данных для отображения</p>
            )
          )}
        </>
      )}
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${getScoreColor(score)}`}>
      {score}%
    </span>
  )
}

function GradeBadge({ grade }: { grade: number }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${getGradeColor(grade)}`}>
      {grade}
    </span>
  )
}
