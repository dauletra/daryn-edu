import { useState } from 'react'
import { FloatingTool } from './FloatingTool'
import {
  ELEMENTS,
  gridPosition,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type PeriodicElement,
  type ElementCategory,
} from '@/data/periodicTable'

interface PeriodicTableProps {
  onClose: () => void
}

export function PeriodicTable({ onClose }: PeriodicTableProps) {
  const [selected, setSelected] = useState<PeriodicElement | null>(null)

  return (
    <FloatingTool
      title="Менделеев кестесі"
      onClose={onClose}
      width={760}
      defaultPosition={{
        x: Math.max(20, (window.innerWidth - 760) / 2),
        y: 60,
      }}
    >
      <div className="overflow-x-auto">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: 'repeat(18, minmax(34px, 1fr))',
            gridTemplateRows: 'repeat(9, 42px)',
          }}
        >
          {ELEMENTS.map((el) => {
            const { row, col } = gridPosition(el.n)
            const colors = CATEGORY_COLORS[el.cat]
            const isSelected = selected?.n === el.n
            return (
              <button
                key={el.n}
                onClick={() => setSelected(isSelected ? null : el)}
                style={{ gridRow: row, gridColumn: col }}
                className={`rounded-sm border text-left p-[2px] leading-tight cursor-pointer transition-colors ${colors} ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : 'border-transparent'
                }`}
              >
                <div className="text-[8px] font-medium opacity-70">{el.n}</div>
                <div className="text-[13px] font-bold leading-none">{el.sym}</div>
                <div className="text-[7px] opacity-80 truncate">{el.mass}</div>
              </button>
            )
          })}

          {/* Placeholder cells linking main table to Ln/An strips */}
          <div
            style={{ gridRow: 6, gridColumn: 3 }}
            className="rounded-sm border border-purple-300 bg-purple-50 text-purple-700 text-[8px] flex items-center justify-center"
          >
            57–71
          </div>
          <div
            style={{ gridRow: 7, gridColumn: 3 }}
            className="rounded-sm border border-pink-300 bg-pink-50 text-pink-700 text-[8px] flex items-center justify-center"
          >
            89–103
          </div>
        </div>
      </div>

      {/* Selection detail */}
      <div className="mt-3 min-h-[64px] px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
        {selected ? (
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center ${CATEGORY_COLORS[selected.cat]}`}
            >
              <div className="text-[10px] opacity-70">{selected.n}</div>
              <div className="text-lg font-bold leading-none">{selected.sym}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900">
                {selected.nameKz}
                <span className="text-gray-400 font-normal ml-2">({selected.nameRu})</span>
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                Атомдық масса: <span className="font-mono font-medium">{selected.mass}</span>
              </div>
              <div className="text-xs text-gray-500">{CATEGORY_LABELS[selected.cat]}</div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
            {(Object.keys(CATEGORY_LABELS) as ElementCategory[]).map((cat) => (
              <div key={cat} className="flex items-center gap-1">
                <span className={`inline-block w-3 h-3 rounded-sm ${CATEGORY_COLORS[cat].split(' ')[0]}`} />
                <span>{CATEGORY_LABELS[cat]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </FloatingTool>
  )
}
