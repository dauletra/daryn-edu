import { useEffect, useMemo, useState } from 'react'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import {
  getClasses,
  getUsers,
  getResultsByBank,
  getResultsByBankAndClassLevel,
} from '@/services/db'
import { useBank } from '@/context/BankContext'
import { useToast } from '@/context/ToastContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { generateReport, type ReportPayload } from '@/services/claude'
import type { ClassLevel } from '@/types'
import {
  computeBankReport,
  computeParallelReport,
} from './parallelReport/reportComputations'
import { ReportTable } from './parallelReport/ReportTable'
import { exportReportToWord } from './parallelReport/exportWord'

type Scope = 'parallel' | 'bank'

const CLASS_LEVELS: ClassLevel[] = [7, 8, 9, 10, 11]
const INSTRUCTIONS_STORAGE_KEY = 'educore_report_custom_instructions'

export function ParallelReportPage() {
  const { selectedBank, selectedBankId, loading: loadingBanks } = useBank()
  const { showSuccess, showError } = useToast()

  const { data: classes, loading: loadingClasses } = useFirestoreQuery(() => getClasses())
  const { data: students, loading: loadingStudents } = useFirestoreQuery(() => getUsers('student'))

  const [scope, setScope] = useState<Scope>('parallel')
  const [classLevel, setClassLevel] = useState<ClassLevel | ''>('')

  const [customInstructions, setCustomInstructions] = useState<string>(() => {
    return localStorage.getItem(INSTRUCTIONS_STORAGE_KEY) ?? ''
  })

  const [reportText, setReportText] = useState<string>('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    setReportText('')
  }, [selectedBankId, scope, classLevel])

  useEffect(() => {
    localStorage.setItem(INSTRUCTIONS_STORAGE_KEY, customInstructions)
  }, [customInstructions])

  // Загружаем результаты в зависимости от scope
  const { data: results, loading: loadingResults } = useFirestoreQuery(() => {
    if (!selectedBankId) return Promise.resolve([])
    if (scope === 'parallel') {
      if (!classLevel) return Promise.resolve([])
      return getResultsByBankAndClassLevel(selectedBankId, classLevel)
    }
    return getResultsByBank(selectedBankId)
  }, [selectedBankId, scope, classLevel])

  const period = useMemo(() => {
    if (!selectedBank) return ''
    return `${selectedBank.academicYear}–${selectedBank.academicYear + 1} оқу жылы, ${selectedBank.quarter}-тоқсан`
  }, [selectedBank])

  const payload: ReportPayload | null = useMemo(() => {
    if (!selectedBank || !results || results.length === 0 || !classes || !students) {
      return null
    }
    if (scope === 'parallel') {
      if (!classLevel) return null
      return computeParallelReport({
        bankTitle: selectedBank.name,
        period,
        classLevel,
        results,
        classes,
        students,
      })
    }
    return computeBankReport({
      bankTitle: selectedBank.name,
      period,
      results,
      classes,
      students,
    })
  }, [selectedBank, results, classes, students, scope, classLevel, period])

  const reportTitle = useMemo(() => {
    if (!selectedBank) return ''
    if (scope === 'parallel' && classLevel) {
      return `${classLevel}-сыныптар параллелі бойынша анықтама — ${selectedBank.name}`
    }
    return `Тест банкі бойынша анықтама — ${selectedBank.name}`
  }, [selectedBank, scope, classLevel])

  async function handleGenerate() {
    if (!payload) return
    setGenerating(true)
    try {
      const text = await generateReport({
        ...payload,
        customInstructions: customInstructions.trim() || undefined,
      })
      setReportText(text)
      showSuccess('Анықтама дайын')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Қате кетті')
    } finally {
      setGenerating(false)
    }
  }

  async function handleExportWord() {
    if (!payload || !reportText) return
    try {
      await exportReportToWord({ payload, title: reportTitle, reportText })
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Word экспорттау қатесі')
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loadingBanks || loadingClasses || loadingStudents) {
    return <LoadingSpinner />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6 no-print">Анықтама</h1>

      {!selectedBankId ? (
        <p className="text-gray-500 text-center py-12">
          Беттің жоғарғы жағынан тест банкін таңдаңыз
        </p>
      ) : (
        <>
          {/* Фильтры */}
          <div className="flex flex-wrap items-center gap-4 mb-6 no-print">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Қамту:</label>
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as Scope)
                  if (e.target.value === 'bank') setClassLevel('')
                }}
                className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="parallel">Бір параллель бойынша</option>
                <option value="bank">Барлық параллельдер бойынша</option>
              </select>
            </div>

            {scope === 'parallel' && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Параллель:</label>
                <select
                  value={classLevel}
                  onChange={(e) =>
                    setClassLevel(
                      e.target.value ? (Number(e.target.value) as ClassLevel) : ''
                    )
                  }
                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Таңдаңыз...</option>
                  {CLASS_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l} сынып
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {scope === 'parallel' && !classLevel ? (
            <p className="text-gray-500 text-center py-12">
              Анықтаманы жасау үшін параллельді таңдаңыз
            </p>
          ) : loadingResults ? (
            <LoadingSpinner />
          ) : !payload ? (
            <p className="text-gray-500 text-center py-12">Көрсетуге деректер жоқ</p>
          ) : (
            <>
              {/* Заголовок справки (виден и при печати) */}
              <div className="print-only mb-4 text-center">
                <div className="text-lg font-bold uppercase">Анықтама</div>
                <div className="text-sm">{reportTitle}</div>
                <div className="text-xs text-gray-600">
                  Тест банкі: {payload.bankTitle} | Кезең: {payload.period}
                </div>
              </div>

              {/* Общие показатели */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard
                  label="Тапсырды"
                  value={`${payload.overall.studentsTook}${
                    payload.overall.studentsTotal > 0
                      ? ` / ${payload.overall.studentsTotal}`
                      : ''
                  }`}
                />
                <StatCard
                  label="Қамту"
                  value={
                    payload.overall.studentsTotal > 0
                      ? `${Math.round((payload.overall.studentsTook / payload.overall.studentsTotal) * 100)}%`
                      : '—'
                  }
                />
                <StatCard label="Орташа балл" value={`${payload.overall.avgScore}%`} />
                <StatCard label="Өту көрсеткіші" value={`${payload.overall.passRate}%`} />
              </div>

              {/* Таблица */}
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Сыныптар мен пәндер бойынша кесте
              </h2>
              <div className="mb-6">
                <ReportTable payload={payload} />
              </div>

              {/* Поле дополнительных инструкций для Claude */}
              <div className="bg-white rounded-xl shadow-sm p-4 mb-4 no-print">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Қосымша нұсқаулар Claude-қа{' '}
                  <span className="text-gray-400 font-normal">(міндетті емес)</span>
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Мысалы: «барлық пәндер бойынша 40%-дан төмен балл алған оқушыларды тізімде атап өт», «тек 9-сыныптар туралы жаз», «химия пәніндегі төмен нәтижеге ерекше назар аудар», «есімдерді көрсетпей, тек статистика бер», «қысқа, 1 бет көлемінде жаз»."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {customInstructions.length} / 2000
                </div>
              </div>

              <div className="flex gap-2 mb-6 no-print">
                <Button onClick={handleGenerate} isLoading={generating}>
                  {reportText ? 'Қайта жасау' : 'Анықтама мәтінін жасау'}
                </Button>
                {reportText && (
                  <>
                    <Button variant="secondary" onClick={handleExportWord}>
                      Word-қа жүктеу
                    </Button>
                    <Button variant="secondary" onClick={handlePrint}>
                      Басып шығару
                    </Button>
                  </>
                )}
              </div>

              {/* Сгенерированный текст (редактируемый) */}
              {reportText && (
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 report-text-block">
                  <div className="flex items-center justify-between mb-3 no-print">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Анықтама мәтіні
                    </h2>
                    <span className="text-xs text-gray-400">
                      Өңдеуге болады
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 print-only">
                    Талдау және қорытынды
                  </h2>
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    rows={Math.max(12, reportText.split('\n').length + 2)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap report-textarea"
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
