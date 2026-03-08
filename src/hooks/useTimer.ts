import { useState, useEffect, useCallback, useRef } from 'react'

interface UseTimerReturn {
  timeLeft: number
  isRunning: boolean
  formatted: string
  start: (seconds: number) => void
  isExpired: boolean
  isWarning: boolean
}

export function useTimer(onExpire?: () => void): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setIsRunning(false)
          onExpireRef.current?.()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, timeLeft])

  const start = useCallback((seconds: number) => {
    setTimeLeft(seconds)
    setIsRunning(true)
  }, [])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return {
    timeLeft,
    isRunning,
    formatted,
    start,
    isExpired: timeLeft <= 0 && !isRunning,
    isWarning: timeLeft > 0 && timeLeft <= 300, // 5 minutes
  }
}
