import { useState, useEffect, useCallback } from 'react'
import { generateQuestions } from '@/services/claude'
import { addQuestions } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { MathText } from '@/components/ui/MathText'
import type { ClassLevel } from '@/types'

interface GeneratedQ {
  text: string
  options: string[]
  correctIndex: number
  selected: boolean
}

interface AIQuestionGeneratorProps {
  testId: string
  subject: string
  language: string
  classLevel: ClassLevel
  onQuestionsAdded: () => void
}

export function AIQuestionGenerator({ testId, subject, language, classLevel, onQuestionsAdded }: AIQuestionGeneratorProps) {
  const { showSuccess, showError } = useToast()
  const [topic, setTopic] = useState(() => localStorage.getItem(`ai-topic-${testId}`) ?? '')
  const [questionCount, setQuestionCount] = useState<10 | 20 | 30>(() => {
    const saved = localStorage.getItem(`ai-count-${testId}`)
    return saved === '20' ? 20 : saved === '30' ? 30 : 10
  })

  const handleTopicChange = useCallback((value: string) => {
    setTopic(value)
    localStorage.setItem(`ai-topic-${testId}`, value)
  }, [testId])

  const handleCountChange = useCallback((value: 10 | 20 | 30) => {
    setQuestionCount(value)
    localStorage.setItem(`ai-count-${testId}`, String(value))
  }, [testId])

  useEffect(() => {
    setTopic(localStorage.getItem(`ai-topic-${testId}`) ?? '')
    const saved = localStorage.getItem(`ai-count-${testId}`)
    setQuestionCount(saved === '20' ? 20 : saved === '30' ? 30 : 10)
  }, [testId])
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<GeneratedQ[]>([])
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  const handleGenerate = async () => {
    if (!topic.trim()) {
      showError('Укажите тему')
      return
    }
    setGenerating(true)
    try {
      const questions = await generateQuestions(topic.trim(), `${classLevel} класс`, subject, questionCount, language)
      setGenerated(questions.map((q) => ({ ...q, selected: false })))
      showSuccess(`Сгенерировано ${questions.length} вопросов`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка генерации')
    } finally {
      setGenerating(false)
    }
  }

  const toggleSelect = (idx: number) => {
    setGenerated((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, selected: !q.selected } : q))
    )
  }

  const toggleSelectAll = () => {
    const allSelected = generated.every((q) => q.selected)
    setGenerated((prev) => prev.map((q) => ({ ...q, selected: !allSelected })))
  }

  const removeQuestion = (idx: number) => {
    setGenerated((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateQuestion = (idx: number, field: keyof GeneratedQ, value: unknown) => {
    setGenerated((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    )
  }

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setGenerated((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        const newOpts = [...q.options]
        newOpts[optIdx] = value
        return { ...q, options: newOpts }
      })
    )
  }

  const selectedCount = generated.filter((q) => q.selected).length

  const handleAddSelected = async () => {
    const selected = generated.filter((q) => q.selected)
    if (selected.length === 0) {
      showError('Выберите хотя бы один вопрос')
      return
    }
    setAdding(true)
    try {
      await addQuestions(
        testId,
        selected.map((q) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
        }))
      )
      showSuccess(`Добавлено ${selected.length} вопросов в банк`)
      setGenerated((prev) => prev.filter((q) => !q.selected))
      onQuestionsAdded()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка добавления')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left panel - generation form */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Генерация вопросов AI</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тема</label>
            <textarea
              value={topic}
              onChange={(e) => handleTopicChange(e.target.value)}
              placeholder="Законы Ньютона, кинематика равномерного движения..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Количество вопросов</label>
            <div className="flex gap-2">
              {([10, 20, 30] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleCountChange(n)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    questionCount === n
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleGenerate} isLoading={generating} disabled={generating}>
            Сгенерировать
          </Button>
        </div>
      </div>

      {/* Right panel - generated questions */}
      <div className="bg-white rounded-xl shadow-sm p-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Сгенерированные вопросы ({generated.length})
          </h3>
          {generated.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              {generated.every((q) => q.selected) ? 'Снять все' : 'Выбрать все'}
            </button>
          )}
        </div>

        {generated.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Сгенерируйте вопросы с помощью AI
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {generated.map((q, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-3 ${
                  q.selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {editingIdx === idx ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={q.text}
                      onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                      rows={2}
                    />
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={q.correctIndex === i}
                          onChange={() => updateQuestion(idx, 'correctIndex', i)}
                          className="cursor-pointer"
                        />
                        <input
                          value={opt}
                          onChange={(e) => updateOption(idx, i, e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      className="text-xs self-end"
                      onClick={() => setEditingIdx(null)}
                    >
                      Готово
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={q.selected}
                        onChange={() => toggleSelect(idx)}
                        className="mt-1 cursor-pointer"
                      />
                      <p className="text-sm text-gray-900 flex-1"><MathText text={q.text} /></p>
                    </div>
                    <div className="ml-6 mt-1 grid grid-cols-2 gap-1">
                      {q.options.map((opt, i) => (
                        <span
                          key={i}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            i === q.correctIndex
                              ? 'bg-green-100 text-green-700'
                              : 'text-gray-500'
                          }`}
                        >
                          {String.fromCharCode(65 + i)}. <MathText text={opt} />
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2 ml-6">
                      <button
                        onClick={() => setEditingIdx(idx)}
                        className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => removeQuestion(idx)}
                        className="text-xs text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedCount > 0 && (
          <div className="sticky bottom-0 bg-white pt-3 mt-3 border-t border-gray-200">
            <Button onClick={handleAddSelected} isLoading={adding} className="w-full">
              Добавить выбранные ({selectedCount}) в банк
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
