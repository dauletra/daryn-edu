import type { ReportPayload } from '@/services/claude'
import { getScoreColor } from '@/utils/scoreUtils'
import {
  uniqueClassesFromMatrix,
  uniqueSubjectsFromMatrix,
  getMatrixCell,
} from './reportComputations'

interface ReportTableProps {
  payload: ReportPayload
}

export function ReportTable({ payload }: ReportTableProps) {
  const classNames = uniqueClassesFromMatrix(payload.byClassSubject)
  const subjects = uniqueSubjectsFromMatrix(payload.byClassSubject)

  if (classNames.length === 0 || subjects.length === 0) {
    return <p className="text-gray-500 text-center py-8">Көрсетуге деректер жоқ</p>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-x-auto report-table-wrapper">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-500 sticky left-0 bg-gray-50 z-10">
              Сынып
            </th>
            {subjects.map((s) => (
              <th key={s} className="text-center px-3 py-2 font-medium text-gray-500">
                {s}
              </th>
            ))}
            <th className="text-center px-3 py-2 font-medium text-gray-500 bg-gray-100">
              Орташа
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {classNames.map((cn) => {
            const classRow = payload.byClass.find((c) => c.className === cn)
            return (
              <tr key={cn} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white z-10">
                  {cn}
                </td>
                {subjects.map((s) => {
                  const cell = getMatrixCell(payload.byClassSubject, cn, s)
                  return (
                    <td key={s} className="px-3 py-2 text-center">
                      {cell ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-medium ${getScoreColor(cell.avgScore)}`}
                          title={`${cell.studentsTook} оқушы`}
                        >
                          {cell.avgScore}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-center bg-gray-50">
                  {classRow ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-semibold ${getScoreColor(classRow.avgScore)}`}
                    >
                      {classRow.avgScore}%
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            )
          })}
          <tr className="bg-gray-50 font-semibold">
            <td className="px-3 py-2 text-gray-700 sticky left-0 bg-gray-50 z-10">
              Пән бойынша
            </td>
            {subjects.map((s) => {
              const subjectRow = payload.bySubject.find((r) => r.subject === s)
              return (
                <td key={s} className="px-3 py-2 text-center">
                  {subjectRow ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded ${getScoreColor(subjectRow.avgScore)}`}
                    >
                      {subjectRow.avgScore}%
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              )
            })}
            <td className="px-3 py-2 text-center bg-gray-100">
              <span
                className={`inline-block px-2 py-0.5 rounded ${getScoreColor(payload.overall.avgScore)}`}
              >
                {payload.overall.avgScore}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
