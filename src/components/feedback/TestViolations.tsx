import { useMemo, useState } from 'react'
import type { Timestamp } from 'firebase/firestore'
import { Modal } from '@/components/ui/Modal'
import type { TestEvent, TestEventType } from '@/types'

/** Human-readable Kazakh label for each audit-event type. */
const EVENT_LABELS: Record<TestEventType, string> = {
  fullscreen_exit: 'Толық экраннан шықты',
  tab_hidden: 'Басқа бетке ауысты',
  window_blur: 'Терезеден фокус кетті',
  copy_attempt: 'Көшіруге әрекет',
  paste_attempt: 'Қоюға әрекет',
  context_menu: 'Контекстік мәзір',
  back_attempt: 'Артқа қайту әрекеті',
  devtools_shortcut: 'DevTools тіркесімі',
  print_attempt: 'Басып шығару/сақтау әрекеті',
}

const EVENT_ICONS: Record<TestEventType, string> = {
  fullscreen_exit: '⛶',
  tab_hidden: '↗',
  window_blur: '○',
  copy_attempt: '📋',
  paste_attempt: '📥',
  context_menu: '☰',
  back_attempt: '←',
  devtools_shortcut: '⚙',
  print_attempt: '🖨',
}

interface TestViolationsProps {
  events?: TestEvent[]
  studentName?: string
  startedAt?: Timestamp | Date
}

/** Hides Timestamp.toDate() vs Date detection. */
function toDate(t: Timestamp | Date | undefined): Date | null {
  if (!t) return null
  if (t instanceof Date) return t
  if (typeof (t as Timestamp).toDate === 'function') return (t as Timestamp).toDate()
  return null
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatOffset(d: Date, start: Date): string {
  const sec = Math.max(0, Math.floor((d.getTime() - start.getTime()) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `+${m}:${s.toString().padStart(2, '0')}`
}

export function TestViolations({ events, studentName, startedAt }: TestViolationsProps) {
  const [open, setOpen] = useState(false)

  const sorted = useMemo(() => {
    if (!events) return []
    return [...events].sort((a, b) => {
      const ta = toDate(a.at)?.getTime() ?? 0
      const tb = toDate(b.at)?.getTime() ?? 0
      return ta - tb
    })
  }, [events])

  const count = sorted.length
  if (count === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  const variant = count >= 10 ? 'danger' : count >= 3 ? 'warning' : 'info'
  const variantClasses = {
    info: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    warning: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200',
  } as const

  const startDate = toDate(startedAt)

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer ${variantClasses[variant]}`}
        title="Бұзушылықтар тізімі"
      >
        ⚠ {count}
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={`Тест кезіндегі әрекеттер${studentName ? ` — ${studentName}` : ''}`}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-gray-500 mb-3">
            Барлығы: <span className="font-semibold text-gray-800">{count}</span>
          </p>
          <div className="flex flex-col gap-1">
            {sorted.map((ev, i) => {
              const d = toDate(ev.at)
              const label = EVENT_LABELS[ev.type] ?? ev.type
              const icon = EVENT_ICONS[ev.type] ?? '•'
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 text-sm"
                >
                  <span className="text-base w-6 text-center select-none">{icon}</span>
                  <span className="flex-1 text-gray-800">{label}</span>
                  {d && (
                    <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                      {formatTime(d)}
                      {startDate && (
                        <span className="text-gray-400 ml-1">({formatOffset(d, startDate)})</span>
                      )}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </>
  )
}
