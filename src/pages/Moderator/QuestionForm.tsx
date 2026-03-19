import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface QuestionFormProps {
  initialData?: {
    text: string
    options: string[]
    correctIndex: number
  }
  onSubmit: (data: { text: string; options: string[]; correctIndex: number }) => Promise<void>
  onCancel: () => void
}

export function QuestionForm({ initialData, onSubmit, onCancel }: QuestionFormProps) {
  const [text, setText] = useState(initialData?.text ?? '')
  const [options, setOptions] = useState<string[]>(
    initialData?.options ?? ['', '', '', '', '']
  )
  const [correctIndex, setCorrectIndex] = useState(initialData?.correctIndex ?? 0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!text.trim()) {
      setError('Сұрақ мәтінін енгізіңіз')
      return
    }
    if (options.some((o) => !o.trim())) {
      setError('Барлық жауап нұсқаларын толтырыңыз')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ text: text.trim(), options: options.map((o) => o.trim()), correctIndex })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Қате')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium text-gray-700">Сұрақ мәтіні</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Жауап нұсқалары</label>
        {options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correctAnswer"
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
              className="cursor-pointer"
            />
            <input
              value={option}
              onChange={(e) => updateOption(i, e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder={`Нұсқа ${String.fromCharCode(65 + i)}`}
            />
          </div>
        ))}
        <p className="text-xs text-gray-400 mt-1">Радиотүймені пайдаланып дұрыс жауапты таңдаңыз</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel} className="text-sm">
          Болдырмау
        </Button>
        <Button type="submit" isLoading={submitting} className="text-sm">
          {initialData ? 'Сақтау' : 'Қосу'}
        </Button>
      </div>
    </form>
  )
}
