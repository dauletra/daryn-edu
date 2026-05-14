import { FloatingTool } from './FloatingTool'

interface ActivitySeriesProps {
  onClose: () => void
}

/**
 * Standard electrochemical activity series used in Kazakh/Russian school chemistry.
 * Order matters: from most active (Li) to least active (Au).
 * Hydrogen marks the boundary — metals before H displace it from acids.
 */
const SERIES = [
  'Li', 'K', 'Ba', 'Ca', 'Na', 'Mg', 'Al', 'Mn', 'Zn', 'Cr',
  'Fe', 'Cd', 'Co', 'Ni', 'Sn', 'Pb', 'H', 'Cu', 'Hg', 'Ag', 'Pt', 'Au',
]

/** Color shifts smoothly from active (red) → neutral (orange) → noble (gray-blue). */
function getCellColor(index: number, total: number, sym: string): string {
  if (sym === 'H') return 'bg-blue-100 text-blue-900 border-blue-500'
  const ratio = index / (total - 1)
  if (ratio < 0.2) return 'bg-red-100 text-red-900'
  if (ratio < 0.4) return 'bg-orange-100 text-orange-900'
  if (ratio < 0.6) return 'bg-yellow-100 text-yellow-900'
  if (ratio < 0.8) return 'bg-lime-100 text-lime-900'
  return 'bg-slate-200 text-slate-700'
}

export function ActivitySeries({ onClose }: ActivitySeriesProps) {
  return (
    <FloatingTool
      title="Металдардың белсенділік қатары"
      onClose={onClose}
      width={680}
      defaultPosition={{
        x: Math.max(20, (window.innerWidth - 680) / 2),
        y: 120,
      }}
    >
      {/* Series row */}
      <div className="flex flex-wrap items-center gap-1 mb-3">
        {SERIES.map((sym, i) => {
          const isH = sym === 'H'
          return (
            <div
              key={sym}
              className={`flex flex-col items-center justify-center w-11 h-11 rounded-md border-2 font-bold text-sm ${getCellColor(
                i,
                SERIES.length,
                sym,
              )} ${isH ? 'border-blue-500' : 'border-transparent'}`}
              title={isH ? 'Сутегі — белсенділік шегі' : undefined}
            >
              {sym}
            </div>
          )
        })}
      </div>

      {/* Direction arrow */}
      <div className="flex items-center justify-between text-[11px] text-gray-600 px-1 mb-3">
        <span>← Белсенділігі артады</span>
        <span>Белсенділігі кемиді →</span>
      </div>

      {/* Rules / notes */}
      <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs leading-relaxed text-gray-700">
        <div className="font-semibold text-gray-800 mb-1">Негізгі ережелер:</div>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>
            <span className="font-medium">Сутегіге дейінгі металдар</span> сұйылтылған
            қышқылдардан (HCl, H₂SO₄) сутегін ығыстырады.
          </li>
          <li>
            <span className="font-medium">Әр металл</span> өзінен оң жақтағы металды оның тұзынан ығыстырып шығарады
            (мысалы, Fe + CuSO₄ → FeSO₄ + Cu).
          </li>
          <li>
            <span className="font-medium">Li, K, Ba, Ca, Na</span> — сумен бөлме температурасында әрекеттесіп, сілті береді.
          </li>
          <li>
            <span className="font-medium">Mg–Pb</span> сумен қыздырған кезде ғана әрекеттеседі.
          </li>
          <li>
            <span className="font-medium">Cu, Hg, Ag, Pt, Au</span> — сумен де, сұйылтылған қышқылдармен де әрекеттеспейді.
          </li>
        </ul>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-red-100 rounded-sm" />
          <span>Өте белсенді</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-yellow-100 rounded-sm" />
          <span>Орташа</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-500 rounded-sm" />
          <span>Сутегі (шек)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-slate-200 rounded-sm" />
          <span>Асыл металдар</span>
        </div>
      </div>
    </FloatingTool>
  )
}
