import { useState, useMemo, useEffect } from 'react'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getClasses, getUsers, getSubjects, getResultsByBankAndClassLevel } from '@/services/db'
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

  const { data: levelResults, loading: loadingResults } = useFirestoreQuery(
    () => selectedBankId && filterClassLevel
      ? getResultsByBankAndClassLevel(selectedBankId, filterClassLevel)
      : Promise.resolve([]),
    [selectedBankId, filterClassLevel]
  )

  // Filter classes by selected grade level
  const filteredClasses = useMemo(() => {
    if (!classes || !filterClassLevel) return []
    return classes.filter((c) => c.classLevel === filterClassLevel)
  }, [classes, filterClassLevel])

  // Apply client-side subject filter (classLevel already filtered at DB level)
  const filteredResults = useMemo(() => {
    if (!levelResults) return []
    if (!filterSubjectId) return levelResults as TestResult[]
    return (levelResults as TestResult[]).filter((r) => r.subjectId === filterSubjectId)
  }, [levelResults, filterSubjectId])

  // Enrolled students matching the parallel filter
  const filteredStudents = useMemo(() => {
    if (!students || !filterClassLevel) return []
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
            <label className="text-sm text-gray-600">Параллель (сынып):</label>
            <select
              value={filterClassLevel}
              onChange={(e) => {
                const level = e.target.value ? (Number(e.target.value) as ClassLevel) : ''
                setFilterClassLevel(level)
                setFilterSubjectId('')
              }}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="" disabled>Параллельді таңдаңыз</option>
              {CLASS_LEVELS.map((l) => (
                <option key={l} value={l}>{l} сынып</option>
              ))}
            </select>
          </div>

          {filterClassLevel && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Пән:</label>
              <select
                value={filterSubjectId}
                onChange={(e) => setFilterSubjectId(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Барлығы</option>
                {subjects?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {!selectedBankId ? (
        <p className="text-gray-500 text-center py-12">Беттің жоғарғы жағынан тест банкін таңдаңыз</p>
      ) : !filterClassLevel ? (
        <p className="text-gray-500 text-center py-12">Аналитиканы қарау үшін параллельді таңдаңыз</p>
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
                <div className="text-xs text-gray-500">Оқушылар тапсырды</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">
                  {overallStats.enrolledStudents > 0
                    ? Math.round(overallStats.uniqueStudents / overallStats.enrolledStudents * 100)
                    : 0}%
                </div>
                <div className="text-xs text-gray-500">Оқушылар қамтуы</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{overallStats.avgScore}%</div>
                <div className="text-xs text-gray-500">Орташа балл</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {([
              { key: 'classes' as Tab, label: 'Сыныптар бойынша' },
              { key: 'subjects' as Tab, label: 'Пәндер бойынша' },
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
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Сынып</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Қамту</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Орташа балл</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Орташа баға</th>
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
              <p className="text-gray-500 text-center py-8">Көрсетуге деректер жоқ</p>
            )
          )}

          {activeTab === 'subjects' && (
            subjectRows.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Пән</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Оқушылар тапсырды</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Орташа балл</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Орташа баға</th>
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
              <p className="text-gray-500 text-center py-8">Көрсетуге деректер жоқ</p>
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
