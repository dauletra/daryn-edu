import { useState, useCallback, useEffect } from 'react'

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const enter = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Fullscreen request denied
    }
  }, [])

  const exit = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch {
      // Exit fullscreen failed
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  return { isFullscreen, enter, exit }
}
