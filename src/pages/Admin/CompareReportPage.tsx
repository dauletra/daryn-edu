import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import {
  getClasses,
  getUsers,
  getTestBanks,
  getResultsByBank,
} from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { generateCompareReport } from '@/services/claude'
import {
  computeCompareReport,
  type CompareReportPayload,
} from './parallelReport/compareComputations'
import {
  CompareParallelsTable,
  CompareSubjectsTable,
} from './parallelReport/CompareTables'
import { exportCompareReportToWord } from './parallelReport/exportCompareWord'

const INSTRUCTIONS_STORAGE_KEY = 'educore_compare_report_custom_instructions'

export function CompareReportPage() {
  const [searchParams] = useSearchParams()
  const { showSuccess, showError } = useToast()

  const bankIds = useMemo(() => {
    const raw = searchParams.get('banks') ?? ''
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [searchParams])

  const bankIdsKey = bankIds.join(',')

  const { data: allBanks, loading: loadingBanks } = useFirestoreQuery(() => getTestBanks())
  const { data: classes, loading: loadingClasses } = useFirestoreQuery(() => getClasses())
  const { data: students, loading: loadingStudents } = useFirestoreQuery(() =>
    getUsers('student')
  )

  const { data: resultsByBankId, loading: loadingResults } = useFirestoreQuery(async () => {
    if (bankIds.length === 0) return {} as Record<string, never>
    const entries = await Promise.all(
      bankIds.map(async (id) => [id, await getResultsByBank(id)] as const)
    )
    return Object.fromEntries(entries)
  }, [bankIdsKey])

  const selectedBanks = useMemo(() => {
    if (!allBanks) return []
    return bankIds
      .map((id) => allBanks.find((b) => b.id === id))
      .filter((b): b is NonNullable<typeof b> => !!b)
  }, [allBanks, bankIds])

  const [customInstructions, setCustomInstructions] = useState<string>(() => {
    return localStorage.getItem(INSTRUCTIONS_STORAGE_KEY) ?? ''
  })

  const [reportText, setReportText] = useState<string>('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    setReportText('')
  }, [bankIdsKey])

  useEffect(() => {
    localStorage.setItem(INSTRUCTIONS_STORAGE_KEY, customInstructions)
  }, [customInstructions])

  const payload: CompareReportPayload | null = useMemo(() => {
    if (
      selectedBanks.length === 0 ||
      !resultsByBankId ||
      !classes ||
      !students
    ) {
      return null
    }
    return computeCompareReport({
      banks: selectedBanks,
      resultsByBankId,
      classes,
      students,
    })
  }, [selectedBanks, resultsByBankId, classes, students])

  const reportTitle = useMemo(() => {
    if (selectedBanks.length === 0) return 'Салыстырмалы анықтама'
    return `Салыстырмалы анықтама — ${selectedBanks.length} тест банкі`
  }, [selectedBanks])

  async function handleGenerate() {
    if (!payload) return
    setGenerating(true)
    try {
      const text = await generateCompareReport({
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
    if (!payload) return
    try {
      await exportCompareReportToWord({ payload, title: reportTitle, reportText })
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Word экспорттау қатесі')
    }
  }

  function handlePrint() {
    window.print()
  }

  const loading =
    loadingBanks || loadingClasses || loadingStudents || loadingResults

  return (
    <div>
      <Link
        to="/admin/report"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4 no-print"
      >
        ← Тест банктары тізіміне
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1 no-print">
        Салыстырмалы анықтама
      </h1>

      {bankIds.length < 2 ? (
        <p className="text-gray-500 text-center py-12">
          Салыстыру үшін кемінде 2 тест банкін таңдаңыз
        </p>
      ) : loading ? (
        <LoadingSpinner />
      ) : !payload ? (
        <p className="text-gray-500 text-center py-12">Көрсетуге деректер жоқ</p>
      ) : (
        <>
          {/* Список банков */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 no-print">
            <div className="text-xs uppercase text-gray-400 mb-2">
              Салыстырылатын банктер
            </div>
            <ul className="space-y-1">
              {payload.banks.map((b) => (
                <li key={b.id} className="text-sm text-gray-800">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-gray-500">
                    {' '}
                    — {b.quarter}-тоқсан, {b.academicYear}–{b.academicYear + 1}
                  </span>
                  <span className="text-gray-400">
                    {' '}
                    · {b.overall.studentsTook} оқушы · орташа {b.overall.avgScore}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Print header */}
          <div className="print-only mb-4 text-center">
            <div className="text-lg font-bold uppercase">Салыстырмалы анықтама</div>
            <div className="text-sm">{reportTitle}</div>
          </div>

          {/* Динамика по параллелям */}
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Параллельдер бойынша орташа балл
          </h2>
          <div className="mb-6">
            <CompareParallelsTable payload={payload} />
          </div>

          {/* Сравнение по предметам */}
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Пәндер бойынша орташа балл
          </h2>
          <div className="mb-6">
            <CompareSubjectsTable payload={payload} />
          </div>

          {/* Custom instructions */}
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
              placeholder="Мысалы: «4-тоқсандағы өсу мен төмендеуді ерекше атап өт», «химия пәнінің өзгерісіне көп көңіл бөл», «қысқа, 1 бет көлемінде жаз»."
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
            <Button variant="secondary" onClick={handleExportWord}>
              Word-қа жүктеу
            </Button>
            {reportText && (
              <Button variant="secondary" onClick={handlePrint}>
                Басып шығару
              </Button>
            )}
          </div>

          {reportText && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 report-text-block">
              <div className="flex items-center justify-between mb-3 no-print">
                <h2 className="text-lg font-semibold text-gray-900">
                  Анықтама мәтіні
                </h2>
                <span className="text-xs text-gray-400">Өңдеуге болады</span>
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
    </div>
  )
}
