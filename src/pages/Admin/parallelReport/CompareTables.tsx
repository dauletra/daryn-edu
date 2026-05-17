import { getScoreColor } from '@/utils/scoreUtils'
import {
  type CompareReportPayload,
  getBankParallel,
  getBankSubject,
} from './compareComputations'

interface Props {
  payload: CompareReportPayload
}

export function CompareParallelsTable({ payload }: Props) {
  if (payload.parallels.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">Параллельдер бойынша деректер жоқ</p>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-x-auto report-table-wrapper">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-500 sticky left-0 bg-gray-50 z-10">
              Тест банкі
            </th>
            {payload.parallels.map((p) => (
              <th key={p} className="text-center px-3 py-2 font-medium text-gray-500">
                {p} сынып
              </th>
            ))}
            <th className="text-center px-3 py-2 font-medium text-gray-500 bg-gray-100">
              Жалпы
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payload.banks.map((bank) => (
            <tr key={bank.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 sticky left-0 bg-white z-10">
                <div className="font-medium text-gray-900">{bank.name}</div>
                <div className="text-xs text-gray-500">
                  {bank.quarter}-тоқсан · {bank.academicYear}–{bank.academicYear + 1}
                </div>
              </td>
              {payload.parallels.map((p) => {
                const cell = getBankParallel(bank, p)
                return (
                  <td key={p} className="px-3 py-2 text-center">
                    {cell ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-medium ${getScoreColor(cell.avgScore)}`}
                        title={`${cell.studentsTook} оқушы · өту: ${cell.passRate}%`}
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
                <span
                  className={`inline-block px-2 py-0.5 rounded font-semibold ${getScoreColor(bank.overall.avgScore)}`}
                  title={`${bank.overall.studentsTook} оқушы · өту: ${bank.overall.passRate}%`}
                >
                  {bank.overall.avgScore}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CompareSubjectsTable({ payload }: Props) {
  if (payload.subjects.length === 0) {
    return <p className="text-gray-500 text-center py-8">Пәндер бойынша деректер жоқ</p>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-x-auto report-table-wrapper">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-500 sticky left-0 bg-gray-50 z-10">
              Тест банкі
            </th>
            {payload.subjects.map((s) => (
              <th key={s} className="text-center px-3 py-2 font-medium text-gray-500">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payload.banks.map((bank) => (
            <tr key={bank.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 sticky left-0 bg-white z-10">
                <div className="font-medium text-gray-900">{bank.name}</div>
                <div className="text-xs text-gray-500">
                  {bank.quarter}-тоқсан · {bank.academicYear}–{bank.academicYear + 1}
                </div>
              </td>
              {payload.subjects.map((s) => {
                const cell = getBankSubject(bank, s)
                return (
                  <td key={s} className="px-3 py-2 text-center">
                    {cell ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-medium ${getScoreColor(cell.avgScore)}`}
                        title={`${cell.studentsTook} оқушы · өту: ${cell.passRate}%`}
                      >
                        {cell.avgScore}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
