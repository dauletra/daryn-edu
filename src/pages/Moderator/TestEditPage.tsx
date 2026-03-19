import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import {
  getTest,
  getQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  updateTest,
  getActiveResultsForTest,
  getSubjects,
} from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { QuestionForm } from './QuestionForm'
import { AIQuestionGenerator } from './AIQuestionGenerator'
import { MathText } from '@/components/ui/MathText'
import { generateTestTitle } from '@/utils/testTitle'
import type { ClassLevel } from '@/types'
import { LANGUAGES } from '@/types'

const CLASS_LEVELS: ClassLevel[] = [7, 8, 9, 10, 11]

export function TestEditPage() {
  const { id: testId } = useParams<{ id: string }>()
  const { showSuccess, showError } = useToast()

  const { data: test, loading: loadingTest, refetch: refetchTest } = useFirestoreQuery(
    () => getTest(testId!),
    [testId]
  )
  const { data: questions, loading: loadingQuestions, refetch: refetchQuestions } = useFirestoreQuery(
    () => getQuestions(testId!),
    [testId]
  )
  const { data: subjects } = useFirestoreQuery(() => getSubjects())

  const [showAddForm, setShowAddForm] = useState(false)
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editMetaOpen, setEditMetaOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Meta edit fields
  const [editSubjectId, setEditSubjectId] = useState('')
  const [editClassLevel, setEditClassLevel] = useState<ClassLevel>(10)
  const [editLanguage, setEditLanguage] = useState('')
  const [editVariantNumber, setEditVariantNumber] = useState('')
  const [editTimeLimit, setEditTimeLimit] = useState('')
  const [editQuestionCount, setEditQuestionCount] = useState('')

  const openEditMeta = useCallback(() => {
    if (!test) return
    setEditSubjectId(test.subjectId || '')
    setEditClassLevel(test.classLevel || 10)
    setEditLanguage(test.language || '')
    setEditVariantNumber(String(test.variantNumber || 1))
    setEditTimeLimit(String(test.timeLimit))
    setEditQuestionCount(String(test.questionCount))
    setEditMetaOpen(true)
  }, [test])

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testId) return
    const selectedSubject = subjects?.find((s) => s.id === editSubjectId)
    const subjectName = selectedSubject?.name || test?.subject || ''
    const title = generateTestTitle({
      subject: subjectName,
      classLevel: editClassLevel,
      variantNumber: Number(editVariantNumber),
    })
    try {
      await updateTest(testId, {
        subjectId: editSubjectId,
        subject: subjectName,
        classLevel: editClassLevel,
        language: editLanguage.trim(),
        variantNumber: Number(editVariantNumber),
        timeLimit: Number(editTimeLimit),
        questionCount: Number(editQuestionCount),
        title,
      })
      showSuccess('Тест жаңартылды')
      setEditMetaOpen(false)
      refetchTest()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Қате')
    }
  }

  const handleAddQuestion = async (data: { text: string; options: string[]; correctIndex: number }) => {
    if (!testId) return
    await addQuestion(testId, data)
    showSuccess('Сұрақ қосылды')
    setShowAddForm(false)
    refetchQuestions()
  }

  const handleUpdateQuestion = async (
    questionId: string,
    data: { text: string; options: string[]; correctIndex: number }
  ) => {
    if (!testId) return
    await updateQuestion(testId, questionId, data)
    showSuccess('Сұрақ жаңартылды')
    setEditingQuestionId(null)
    refetchQuestions()
  }

  const handleDeleteQuestion = async () => {
    if (!testId || !deleteConfirmId) return
    try {
      const activeResults = await getActiveResultsForTest(testId)
      if (activeResults.length > 0) {
        showError('Тестті өтіп жатқан оқушылар бар. Жою мүмкін емес')
        setDeleteConfirmId(null)
        return
      }
      await deleteQuestion(testId, deleteConfirmId)
      showSuccess('Сұрақ жойылды')
      setDeleteConfirmId(null)
      refetchQuestions()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Жою қатесі')
    }
  }

  if (loadingTest || loadingQuestions) return <LoadingSpinner />
  if (!test) return <p className="text-gray-500">Тест табылмады</p>

  const bankCount = questions?.length ?? 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/moderator/tests" className="text-sm text-blue-600 hover:text-blue-800">
            &larr; Тесттерге оралу
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{test.title}</h1>
          <p className="text-sm text-gray-500">
            {test.subject} &middot; {test.timeLimit} мин &middot; оқушыға {test.questionCount} сұрақ
          </p>
        </div>
        <Button variant="secondary" onClick={openEditMeta}>
          Тест параметрлері
        </Button>
      </div>

      {/* Bank counter */}
      <div className="bg-blue-50 rounded-lg px-4 py-3 mb-4 text-sm text-blue-700">
        Банкте: <strong>{bankCount}</strong> сұрақ, оқушы алады: <strong>{test.questionCount}</strong>
        {bankCount < test.questionCount && (
          <span className="text-red-600 ml-2">
            (жариялау үшін сұрақтар жеткіліксіз)
          </span>
        )}
      </div>

      {/* AI Generator toggle */}
      <div className="mb-6">
        <Button
          variant={showAIGenerator ? 'secondary' : 'primary'}
          onClick={() => setShowAIGenerator(!showAIGenerator)}
        >
          {showAIGenerator ? 'AI генераторды жасыру' : 'AI арқылы сұрақтар жасау'}
        </Button>
      </div>

      {showAIGenerator && testId && (
        <div className="mb-6">
          <AIQuestionGenerator
            testId={testId}
            subject={test.subject}
            language={test.language}
            classLevel={test.classLevel}
            onQuestionsAdded={refetchQuestions}
          />
        </div>
      )}

      {/* Questions list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Сұрақтар банкі</h2>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>Қолмен сұрақ қосу</Button>
        )}
      </div>

      {showAddForm && (
        <div className="mb-4">
          <QuestionForm onSubmit={handleAddQuestion} onCancel={() => setShowAddForm(false)} />
        </div>
      )}

      {questions && questions.length > 0 ? (
        <div className="flex flex-col gap-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm p-4">
              {editingQuestionId === q.id ? (
                <QuestionForm
                  initialData={{ text: q.text, options: q.options, correctIndex: q.correctIndex }}
                  onSubmit={(data) => handleUpdateQuestion(q.id, data)}
                  onCancel={() => setEditingQuestionId(null)}
                />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      <span className="text-gray-400 mr-2">#{idx + 1}</span>
                      <MathText text={q.text} />
                    </p>
                    <div className="mt-2 flex flex-col gap-1">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`text-sm px-2 py-1 rounded ${
                            i === q.correctIndex
                              ? 'bg-green-50 text-green-700 font-medium'
                              : 'text-gray-600'
                          }`}
                        >
                          {String.fromCharCode(65 + i)}. <MathText text={opt} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setEditingQuestionId(q.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Өңдеу
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(q.id)}
                      className="text-sm text-red-600 hover:text-red-800 cursor-pointer"
                    >
                      Жою
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !showAddForm && <p className="text-gray-500 text-center py-8">Сұрақтар әлі жоқ. Алғашқы сұрақты қосыңыз.</p>
      )}

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Сұрақты жою керек пе?">
        <p className="text-sm text-gray-600 mb-6">Сұрақ қалпына келтіру мүмкіндігінсіз жойылады.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>Болдырмау</Button>
          <Button variant="danger" onClick={handleDeleteQuestion}>Жою</Button>
        </div>
      </Modal>

      {/* Edit Meta Modal */}
      <Modal isOpen={editMetaOpen} onClose={() => setEditMetaOpen(false)} title="Тест параметрлері">
        <form onSubmit={handleSaveMeta} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Пән</label>
            <select
              value={editSubjectId}
              onChange={(e) => setEditSubjectId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Пәнді таңдаңыз</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Сынып</label>
              <select
                value={editClassLevel}
                onChange={(e) => setEditClassLevel(Number(e.target.value) as ClassLevel)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CLASS_LEVELS.map((l) => (
                  <option key={l} value={l}>{l} сынып</option>
                ))}
              </select>
            </div>
            <Input label="Нұсқа нөмірі" type="number" value={editVariantNumber} onChange={(e) => setEditVariantNumber(e.target.value)} min="1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Тіл</label>
            <select
              value={editLanguage}
              onChange={(e) => setEditLanguage(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Уақыт шегі (мин)" type="number" value={editTimeLimit} onChange={(e) => setEditTimeLimit(e.target.value)} min="1" />
            <Input label="Оқушыға арналған сұрақтар саны" type="number" value={editQuestionCount} onChange={(e) => setEditQuestionCount(e.target.value)} min="1" />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => setEditMetaOpen(false)}>Болдырмау</Button>
            <Button type="submit">Сақтау</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
