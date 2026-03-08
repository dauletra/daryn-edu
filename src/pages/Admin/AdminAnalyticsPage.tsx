import { useState, useMemo } from 'react'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import {
  getClasses, getUsers, getTestBanks, getSubjects, getResultsByBank,
} from '@/services/db'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { ClassLevel, TestResult } from '@/types'
import {
  computeStats,
  groupByClassLevel,
  groupByClass,
  groupBySubject,
} from './analytics/analyticsUtils'

type Tab = 'grades' | 'classes' | 'subjects'

export function AdminAnalyticsPage() {
  const { data: classes, loading: loadingClasses } = useFirestoreQuery(() => getClasses())
  const { data: students, loading: loadingStudents } = useFirestoreQuery(() => getUsers('student'))
  const { data: testBanks, loading: loadingBanks } = useFirestoreQuery(() => getTestBanks())
  const { data: subjects, loading: loadingSubjects } = useFirestoreQuery(() => getSubjects())

  const [selectedBankId, setSelectedBankId] = useState('')
  const [filterClassLevel, setFilterClassLevel] = useState<ClassLevel | ''>('')
  const [filterClassId, setFilterClassId] = useState('')
  const [filterSubjectId, setFilterSubjectId] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('grades')

  // Load results for selected bank
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

  // Apply client-side filters (grade, class, subject)
  const filteredResults = useMemo(() => {
    if (!bankResults) return []
    return bankResults.filter((r: TestResult) => {
      if (filterClassLevel && r.classLevel !== filterClassLevel) return false
      if (filterClassId && r.classId !== filterClassId) return false
      if (filterSubjectId && r.subjectId !== filterSubjectId) return false
      return true
    })
  }, [bankResults, filterClassLevel, filterClassId, filterSubjectId])

  // Overall stats
  const overallStats = useMemo(() => computeStats(filteredResults), [filteredResults])

  // Tab data
  const gradeLevelRows = useMemo(
    () => groupByClassLevel(filteredResults, classes ?? [], students ?? []),
    [filteredResults, classes, students]
  )

  const classRows = useMemo(
    () => groupByClass(filteredResults, filteredClasses, students ?? []),
    [filteredResults, filteredClasses, students]
  )

  const subjectRows = useMemo(
    () => groupBySubject(filteredResults),
    [filteredResults]
  )

  // Reset dependent filters
  const handleClassLevelChange = (value: string) => {
    const level = value ? (Number(value) as ClassLevel) : ''
    setFilterClassLevel(level)
    setFilterClassId('')
  }

  const CLASS_LEVELS: ClassLevel[] = [7, 8, 9, 10, 11]

  if (loadingClasses || loadingStudents || loadingBanks || loadingSubjects) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Аналитика</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Банк тестов:</label>
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Выберите банк</option>
            {testBanks?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.academicYear}, {b.quarter} четв.)
              </option>
            ))}
          </select>
        </div>

        {selectedBankId && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Параллель:</label>
              <select
                value={filterClassLevel}
                onChange={(e) => handleClassLevelChange(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Все</option>
                {CLASS_LEVELS.map((l) => (
                  <option key={l} value={l}>{l} класс</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Класс:</label>
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Все</option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
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
          </>
        )}
      </div>

      {!selectedBankId ? (
        <p className="text-gray-500 text-center py-12">Выберите банк тестов для просмотра аналитики</p>
      ) : loadingResults ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Overall Stats Cards */}
          {overallStats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{overallStats.totalResults}</div>
                <div className="text-xs text-gray-500">Всего сдано</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{overallStats.avgScore}%</div>
                <div className="text-xs text-gray-500">Средний балл</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-green-600">{overallStats.maxScore}%</div>
                <div className="text-xs text-gray-500">Лучший результат</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-red-600">{overallStats.minScore}%</div>
                <div className="text-xs text-gray-500">Худший результат</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {([
              { key: 'grades' as Tab, label: 'По параллелям' },
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
          {activeTab === 'grades' && (
            gradeLevelRows.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Параллель</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Классов</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Учеников</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Тестов сдано</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Средний балл</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Лучший</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Худший</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gradeLevelRows.map((row) => (
                      <tr key={row.classLevel} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.classLevel} класс</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.classCount}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.studentCount}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.totalResults}</td>
                        <td className="px-4 py-3 text-center">
                          <ScoreBadge score={row.avgScore} />
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="text-green-600 font-medium">{row.maxScore}%</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="text-red-600 font-medium">{row.minScore}%</span>
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

          {activeTab === 'classes' && (
            classRows.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Класс</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Учеников</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Тестов сдано</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Средний балл</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Лучший</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Худший</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {classRows.map((row) => (
                      <tr key={row.classId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.className}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.studentCount}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.totalResults}</td>
                        <td className="px-4 py-3 text-center">
                          <ScoreBadge score={row.avgScore} />
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="text-green-600 font-medium">{row.maxScore}%</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="text-red-600 font-medium">{row.minScore}%</span>
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
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Тестов сдано</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Средний балл</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Лучший</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Худший</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subjectRows.map((row) => (
                      <tr key={row.subjectId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.subjectName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.totalResults}</td>
                        <td className="px-4 py-3 text-center">
                          <ScoreBadge score={row.avgScore} />
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="text-green-600 font-medium">{row.maxScore}%</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="text-red-600 font-medium">{row.minScore}%</span>
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
  const color = score >= 70
    ? 'bg-green-100 text-green-800'
    : score >= 50
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800'

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${color}`}>
      {score}%
    </span>
  )
}
