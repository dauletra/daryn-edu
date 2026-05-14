import { FloatingTool } from './FloatingTool'
import {
  CATIONS,
  ANIONS,
  SOLUBILITY,
  SOLUBILITY_COLORS,
  SOLUBILITY_LABELS,
  type Solubility,
} from '@/data/solubility'

interface SolubilityTableProps {
  onClose: () => void
}

export function SolubilityTable({ onClose }: SolubilityTableProps) {
  return (
    <FloatingTool
      title="Ерігіштік кестесі"
      onClose={onClose}
      width={720}
      defaultPosition={{
        x: Math.max(20, (window.innerWidth - 720) / 2),
        y: 80,
      }}
    >
      <div className="overflow-auto max-h-[60vh]">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-gray-100 border border-gray-300 px-2 py-1 font-semibold text-gray-700">
                Катион \ Анион
              </th>
              {ANIONS.map((a) => (
                <th
                  key={a.sym}
                  className="sticky top-0 z-10 bg-gray-100 border border-gray-300 px-2 py-1 font-mono font-semibold text-gray-700 whitespace-nowrap"
                >
                  {a.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATIONS.map((c, ci) => (
              <tr key={c.sym}>
                <th className="sticky left-0 z-10 bg-gray-100 border border-gray-300 px-2 py-1 font-mono font-semibold text-gray-700 text-left whitespace-nowrap">
                  {c.label}
                </th>
                {ANIONS.map((_, ai) => {
                  const val = SOLUBILITY[ci][ai] as Solubility
                  return (
                    <td
                      key={ai}
                      title={SOLUBILITY_LABELS[val]}
                      className={`border border-gray-300 px-2 py-1 text-center font-semibold ${SOLUBILITY_COLORS[val]}`}
                    >
                      {val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-[11px] text-gray-700 flex flex-wrap gap-x-3 gap-y-1">
          {(Object.keys(SOLUBILITY_LABELS) as Solubility[]).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded font-bold ${SOLUBILITY_COLORS[s]}`}
              >
                {s}
              </span>
              <span>{SOLUBILITY_LABELS[s]}</span>
            </div>
          ))}
        </div>
      </div>
    </FloatingTool>
  )
}
