import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { createTest, getSubjects } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { useBank } from '@/context/BankContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { ClassLevel } from '@/types'
import { LANGUAGES } from '@/types'

const CLASS_LEVELS: ClassLevel[] = [7, 8, 9, 10, 11]

export function TestCreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const { selectedBankId, selectedBank } = useBank()
  const { data: subjects, loading: loadingSubjects } = useFirestoreQuery(() => getSubjects())

  const testBankId = selectedBankId
  const [subjectId, setSubjectId] = useState('')
  const [classLevel, setClassLevel] = useState<ClassLevel>(10)
  const [language, setLanguage] = useState('ru')
  const [variantNumber, setVariantNumber] = useState('1')
  const [timeLimit, setTimeLimit] = useState('30')
  const [questionCount, setQuestionCount] = useState('20')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!subjectId) newErrors.subject = 'Пәнді таңдаңыз'
    if (!language.trim()) newErrors.language = 'Тілді көрсетіңіз'
    if (!variantNumber || Number(variantNumber) < 1) newErrors.variantNumber = 'Нұсқа нөмірін көрсетіңіз'
    if (!timeLimit || Number(timeLimit) < 1) newErrors.timeLimit = 'Уақытты көрсетіңіз'
    if (!questionCount || Number(questionCount) < 1) newErrors.questionCount = 'Санды көрсетіңіз'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    const selectedSubject = subjects?.find((s) => s.id === subjectId)
    if (!selectedSubject) {
      showError('Пән табылмады')
      return
    }

    setSubmitting(true)
    try {
      const testId = await createTest({
        testBankId,
        classLevel,
        subjectId,
        subject: selectedSubject.name,
        language: language.trim(),
        variantNumber: Number(variantNumber),
        createdBy: user!.uid,
        timeLimit: Number(timeLimit),
        questionCount: Number(questionCount),
      })
      showSuccess('Тест жасалды')
      navigate(`/moderator/tests/${testId}/edit`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Жасау қатесі')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingSubjects) return <LoadingSpinner />

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Тест жасау</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Тест банкі</label>
          <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
            {selectedBank
              ? `${selectedBank.name} · ${selectedBank.quarter} тоқс. · ${selectedBank.academicYear}–${selectedBank.academicYear + 1}`
              : <span className="text-gray-400">Банк таңдалмаған</span>
            }
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Пән</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Пәнді таңдаңыз</option>
            {subjects?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.subject && <p className="text-sm text-red-600">{errors.subject}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Сынып</label>
            <select
              value={classLevel}
              onChange={(e) => setClassLevel(Number(e.target.value) as ClassLevel)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CLASS_LEVELS.map((l) => (
                <option key={l} value={l}>{l} сынып</option>
              ))}
            </select>
          </div>
          <Input
            label="Нұсқа нөмірі"
            type="number"
            value={variantNumber}
            onChange={(e) => setVariantNumber(e.target.value)}
            error={errors.variantNumber}
            min="1"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Тіл</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          {errors.language && <p className="text-sm text-red-600">{errors.language}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Уақыт шегі (минут)"
            type="number"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            error={errors.timeLimit}
            min="1"
          />
          <Input
            label="Оқушыға арналған сұрақтар саны"
            type="number"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            error={errors.questionCount}
            min="1"
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="secondary" type="button" onClick={() => navigate('/moderator/tests')}>
            Болдырмау
          </Button>
          <Button type="submit" isLoading={submitting}>Жасау</Button>
        </div>
      </form>
    </div>
  )
}
