import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { createTest, getSubjects, getTestBanks } from '@/services/db'
import { useToast } from '@/context/ToastContext'
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
  const { data: subjects, loading: loadingSubjects } = useFirestoreQuery(() => getSubjects())
  const { data: testBanks, loading: loadingBanks } = useFirestoreQuery(() => getTestBanks())

  const [testBankId, setTestBankId] = useState('')
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
    if (!testBankId) newErrors.testBank = 'Выберите банк тестов'
    if (!subjectId) newErrors.subject = 'Выберите предмет'
    if (!language.trim()) newErrors.language = 'Укажите язык'
    if (!variantNumber || Number(variantNumber) < 1) newErrors.variantNumber = 'Укажите номер варианта'
    if (!timeLimit || Number(timeLimit) < 1) newErrors.timeLimit = 'Укажите время'
    if (!questionCount || Number(questionCount) < 1) newErrors.questionCount = 'Укажите количество'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    const selectedSubject = subjects?.find((s) => s.id === subjectId)
    if (!selectedSubject) {
      showError('Предмет не найден')
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
      showSuccess('Тест создан')
      navigate(`/moderator/tests/${testId}/edit`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка создания')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingSubjects || loadingBanks) return <LoadingSpinner />

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Создать тест</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Банк тестов</label>
          <select
            value={testBankId}
            onChange={(e) => setTestBankId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Выберите банк тестов</option>
            {testBanks?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {errors.testBank && <p className="text-sm text-red-600">{errors.testBank}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Предмет</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Выберите предмет</option>
            {subjects?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.subject && <p className="text-sm text-red-600">{errors.subject}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Класс</label>
            <select
              value={classLevel}
              onChange={(e) => setClassLevel(Number(e.target.value) as ClassLevel)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CLASS_LEVELS.map((l) => (
                <option key={l} value={l}>{l} класс</option>
              ))}
            </select>
          </div>
          <Input
            label="Номер варианта"
            type="number"
            value={variantNumber}
            onChange={(e) => setVariantNumber(e.target.value)}
            error={errors.variantNumber}
            min="1"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Язык</label>
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
            label="Лимит времени (минуты)"
            type="number"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            error={errors.timeLimit}
            min="1"
          />
          <Input
            label="Вопросов для ученика"
            type="number"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            error={errors.questionCount}
            min="1"
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="secondary" type="button" onClick={() => navigate('/moderator/tests')}>
            Отмена
          </Button>
          <Button type="submit" isLoading={submitting}>Создать</Button>
        </div>
      </form>
    </div>
  )
}
