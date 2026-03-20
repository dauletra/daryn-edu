import { Timestamp } from 'firebase/firestore'

export function formatDuration(start: Timestamp | Date, end: Timestamp | Date): string {
  const startMs = start instanceof Timestamp ? start.toMillis() : start.getTime()
  const endMs = end instanceof Timestamp ? end.toMillis() : end.getTime()
  const totalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes} мин ${seconds} сек`
}
