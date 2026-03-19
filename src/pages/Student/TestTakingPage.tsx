import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTimer } from '@/hooks/useTimer'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useTesting } from '@/context/TestingContext'
import {
  getTest,
  updateResult,
  startTestFn,
  submitTestFn,
} from '@/services/db'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { MathText } from '@/components/ui/MathText'
import type { StudentQuestion, Test } from '@/types'

type Phase = 'loading' | 'pre_start' | 'testing' | 'finished'

export function TestTakingPage() {
  const { id: testId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isResume = location.state?.resume === true
  const { isFullscreen, enter: enterFullscreen } = useFullscreen()
  const { setIsTestingActive } = useTesting()

  const [phase, setPhase] = useState<Phase>('loading')
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<StudentQuestion[]>([])
  const [resultId, setResultId] = useState<string>('')
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [score, setScore] = useState<{ correct: number; total: number; percent: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [timeExpired, setTimeExpired] = useState(false)
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false)

  const answersRef = useRef<(number | null)[]>([])
  const submittedRef = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const lastSavedRef = useRef<string>('')
  const wasFullscreenRef = useRef(false)

  // --- Auto-save: debounced on change ---

  const autoSave = useCallback(async (currentAnswers: (number | null)[]) => {
    if (submittedRef.current || !resultId || !questions.length) return
    const answerDocs = questions.map((q, i) => ({
      questionId: q.id,
      selectedIndex: currentAnswers[i] ?? -1,
    }))
    try {
      await updateResult(resultId, { answers: answerDocs })
    } catch {
      // Silent fail on auto-save
    }
  }, [resultId, questions])

  const scheduleSave = useCallback((newAnswers: (number | null)[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      const hash = JSON.stringify(newAnswers)
      if (hash === lastSavedRef.current) return
      lastSavedRef.current = hash
      autoSave(newAnswers)
    }, 5000)
  }, [autoSave])

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, ctx.currentTime)
      gain1.gain.setValueAtTime(0.4, ctx.currentTime)
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc1.connect(gain1); gain1.connect(ctx.destination)
      osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.15)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.25)
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.25)
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
      osc2.connect(gain2); gain2.connect(ctx.destination)
      osc2.start(ctx.currentTime + 0.25); osc2.stop(ctx.currentTime + 0.55)
      osc2.addEventListener('ended', () => ctx.close())
    } catch { /* silent fail */ }
  }, [])

  const handleReturnToFullscreen = useCallback(() => {
    setShowFullscreenWarning(false)
    enterFullscreen()
  }, [enterFullscreen])

  // Save on tab close
  useEffect(() => {
    if (phase !== 'testing' || !resultId || !questions.length) return
    const handleBeforeUnload = () => {
      if (submittedRef.current) return
      const answerDocs = questions.map((q, i) => ({
        questionId: q.id,
        selectedIndex: answersRef.current[i] ?? -1,
      }))
      // Best-effort save on tab close (may not complete)
      updateResult(resultId, { answers: answerDocs }).catch(() => {})
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [phase, resultId, questions])

  // Cleanup save timeout
  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [])

  // Block sidebar navigation only during active testing
  useEffect(() => {
    setIsTestingActive(phase === 'testing')
    return () => setIsTestingActive(false)
  }, [phase, setIsTestingActive])

  // Fullscreen exit detection during test
  useEffect(() => {
    if (phase !== 'testing') return
    if (isFullscreen) {
      wasFullscreenRef.current = true
      setShowFullscreenWarning(false)
      return
    }
    if (wasFullscreenRef.current) {
      playBeep()
      setShowFullscreenWarning(true)
    }
  }, [isFullscreen, phase, playBeep])

  // --- Submit test via Cloud Function ---

  const handleSubmit = useCallback(async (fromTimer = false) => {
    if (submittedRef.current || !questions.length || !resultId) return
    submittedRef.current = true
    setConfirmSubmitOpen(false)
    setSubmitting(true)
    setSubmitError(false)
    if (fromTimer) setTimeExpired(true)

    const answerPayload = questions.map((q, i) => ({
      questionId: q.id,
      selectedIndex: answersRef.current[i] ?? -1,
    }))

    try {
      const result = await submitTestFn(resultId, answerPayload)
      setScore({ correct: result.correctCount, total: result.total, percent: result.score })
      setPhase('finished')
    } catch {
      submittedRef.current = false
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }, [questions, resultId])

  const handleTimerExpire = useCallback(() => {
    handleSubmit(true)
  }, [handleSubmit])

  const { formatted, start: startTimer, isWarning, timeLeft } = useTimer(handleTimerExpire)

  // --- Init: load test via Cloud Function ---

  useEffect(() => {
    if (!testId || !user) return
    let cancelled = false

    async function init() {
      // Fetch test metadata for pre_start screen
      const testData = await getTest(testId!)
      if (!testData || cancelled) return
      setTest(testData)
      setPhase('pre_start')
    }

    init()
    return () => { cancelled = true }
  }, [testId, user?.uid])

  // --- Start or resume test via Cloud Function ---

  const handleStartTest = async () => {
    if (!testId) return
    if (!document.fullscreenElement) {
      enterFullscreen()
    }
    setPhase('loading')

    try {
      const result = await startTestFn(testId)

      if (result.phase === 'already_completed') {
        navigate('/student/tests', { replace: true })
        return
      }

      if (result.phase === 'finished') {
        setScore({
          correct: result.correctCount!,
          total: result.total!,
          percent: result.score!,
        })
        setPhase('finished')
        return
      }

      // phase === 'testing'
      setResultId(result.resultId!)
      setQuestions(result.questions!)

      // Restore answers if resuming
      if (result.answers && result.answers.length > 0) {
        const restored: (number | null)[] = result.questions!.map((q) => {
          const existing = result.answers!.find((a) => a.questionId === q.id)
          return existing && existing.selectedIndex >= 0 ? existing.selectedIndex : null
        })
        setAnswers(restored)
        answersRef.current = restored
      } else {
        const empty: (number | null)[] = new Array(result.questions!.length).fill(null)
        setAnswers(empty)
        answersRef.current = empty
      }

      startTimer(result.remainingSeconds!)
      setPhase('testing')
    } catch {
      setPhase('pre_start')
    }
  }

  const selectAnswer = (optionIndex: number) => {
    const newAnswers = [...answers]
    newAnswers[currentIndex] = optionIndex
    setAnswers(newAnswers)
    answersRef.current = newAnswers
    scheduleSave(newAnswers)
  }

  const unansweredCount = answers.filter((a) => a === null).length

  // --- RENDER ---

  if (phase === 'loading') return <LoadingSpinner />

  if (phase === 'pre_start' && test) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{test.title.replace(/ - Вариант \d+$/, '')}</h1>
          <p className="text-gray-500 mb-4">{test.subject}</p>
          <div className="flex justify-center gap-6 text-sm text-gray-600 mb-6">
            <div>
              <div className="font-bold text-lg text-gray-900">{test.questionCount}</div>
              <div>сұрақ</div>
            </div>
            <div>
              <div className="font-bold text-lg text-gray-900">{test.timeLimit}</div>
              <div>минут</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Тест толық экран режимінде өтеді. Басталғаннан кейін таймерді тоқтатуға болмайды.
          </p>
          <Button onClick={handleStartTest} className="w-full">
            {isResume ? 'Тестті жалғастыру' : 'Тестті бастау'}
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'finished' && score) {
    const colorClass =
      score.percent >= 70
        ? 'text-green-600'
        : score.percent >= 50
        ? 'text-yellow-600'
        : 'text-red-600'

    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Тест аяқталды</h1>
          <div className={`text-5xl font-bold ${colorClass} mb-2`}>{score.percent}%</div>
          <p className="text-gray-600 text-lg">
            {score.correct} / {score.total}
          </p>
          <Button
            className="mt-6"
            onClick={() => navigate('/student/tests')}
          >
            Тесттерге оралу
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'testing' && questions.length > 0) {
    const currentQuestion = questions[currentIndex]

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Fullscreen warning */}
        {!isFullscreen && !showFullscreenWarning && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-yellow-700">
              Тестті толық экран режимінде өткен дұрыс
            </span>
            <button
              onClick={enterFullscreen}
              className="text-sm text-yellow-700 font-medium hover:text-yellow-900 cursor-pointer"
            >
              Толық экран режиміне оралу
            </button>
          </div>
        )}

        {/* Header with timer */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Сұрақ {currentIndex + 1} / {questions.length}
          </div>
          <div
            className={`text-2xl font-mono font-bold ${
              isWarning
                ? timeLeft <= 60
                  ? 'text-red-600 animate-pulse'
                  : 'text-orange-500'
                : 'text-gray-800'
            }`}
          >
            {formatted}
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6">
          {/* Question grid */}
          <div className="flex flex-wrap gap-1 mb-6">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-8 h-8 text-xs rounded font-medium cursor-pointer ${
                  i === currentIndex
                    ? 'bg-blue-600 text-white'
                    : answers[i] !== null
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Question */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="text-lg text-gray-900 mb-6"><MathText text={currentQuestion.text} /></div>
            <div className="flex flex-col gap-3">
              {currentQuestion.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => selectAnswer(i)}
                  disabled={submitting || submitError}
                  className={`text-left px-4 py-3 rounded-lg border-2 transition-colors cursor-pointer ${
                    answers[currentIndex] === i
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  } ${submitting || submitError ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                  <MathText text={option} />
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0 || submitting || submitError}
            >
              Артқа
            </Button>
            <Button
              variant="danger"
              onClick={() => setConfirmSubmitOpen(true)}
              disabled={submitting || submitError}
            >
              Тестті аяқтау
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex === questions.length - 1 || submitting || submitError}
            >
              Алға
            </Button>
          </div>
        </div>

        {/* Confirm submit modal */}
        <Modal
          isOpen={confirmSubmitOpen}
          onClose={() => setConfirmSubmitOpen(false)}
          title="Тестті аяқтау керек пе?"
        >
          <div className="mb-4">
            {unansweredCount > 0 ? (
              <p className="text-sm text-red-600">
                Жауапсыз: {unansweredCount} / {questions.length} сұрақ
              </p>
            ) : (
              <p className="text-sm text-green-600">
                Барлық {questions.length} сұраққа жауап бердіңіз
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmSubmitOpen(false)}>
              Оралу
            </Button>
            <Button variant="danger" onClick={() => handleSubmit()}>
              Аяқтау
            </Button>
          </div>
        </Modal>

        {/* Submitting overlay */}
        {submitting && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 text-center shadow-lg max-w-sm mx-4">
              <LoadingSpinner />
              <p className="mt-3 text-gray-700 font-medium">
                {timeExpired ? 'Уақыт бітті! Нәтижелер жіберілуде...' : 'Нәтижелер жіберілуде...'}
              </p>
            </div>
          </div>
        )}

        {/* Submit error with retry */}
        {submitError && !submitting && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 text-center shadow-lg max-w-sm mx-4">
              <p className="text-red-600 font-medium mb-2">Нәтижелерді жіберу мүмкін болмады</p>
              <p className="text-sm text-gray-500 mb-4">Интернет қосылымын тексеріңіз</p>
              <Button onClick={() => handleSubmit(timeExpired)}>
                Қайта көру
              </Button>
            </div>
          </div>
        )}

        {/* Fullscreen exit warning overlay */}
        {showFullscreenWarning && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="animate-pulse bg-red-600 absolute inset-0 opacity-10 pointer-events-none" />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-8 text-center border-4 border-red-500">
              <div className="animate-bounce text-5xl mb-4 select-none">⚠️</div>
              <h2 className="text-xl font-bold text-red-700 mb-2">
                Толық экран режимінен шықтыңыз!
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Тест кезінде толық экран режимінде болу керек. Оралыңыз.
              </p>
              <button
                onClick={handleReturnToFullscreen}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl text-base transition-colors cursor-pointer animate-pulse"
              >
                Толық экран режиміне оралу
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
