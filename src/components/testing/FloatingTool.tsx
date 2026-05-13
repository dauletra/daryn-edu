import { useEffect, useRef, useState, type ReactNode } from 'react'

interface FloatingToolProps {
  title: string
  onClose: () => void
  defaultPosition?: { x: number; y: number }
  width?: number
  children: ReactNode
}

export function FloatingTool({
  title,
  onClose,
  defaultPosition,
  width = 300,
  children,
}: FloatingToolProps) {
  const [pos, setPos] = useState(() => {
    if (defaultPosition) return defaultPosition
    // Default: top-right corner with padding
    const x = Math.max(20, window.innerWidth - width - 24)
    return { x, y: 80 }
  })

  const dragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: pos.x,
      offsetY: pos.y,
    }
    e.preventDefault()
  }

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const newX = Math.max(0, Math.min(window.innerWidth - 100, dragRef.current.offsetX + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.offsetY + dy))
      setPos({ x: newX, y: newY })
    }
    const handleUp = () => {
      dragRef.current = null
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [])

  return (
    <div
      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 select-none"
      style={{ left: pos.x, top: pos.y, width, zIndex: 40 }}
    >
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-4 py-2 bg-gray-100 rounded-t-xl cursor-move border-b border-gray-200"
      >
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer px-1"
          aria-label="Жабу"
        >
          &times;
        </button>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}
