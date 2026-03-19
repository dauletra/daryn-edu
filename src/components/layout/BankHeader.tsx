import { useBank } from '@/context/BankContext'

export function BankHeader() {
  const { banks, selectedBankId, setSelectedBankId, loading } = useBank()

  if (loading) return null

  if (banks.length === 0) {
    return (
      <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center gap-2">
        <span className="text-sm text-amber-700">⚠ Тест банктары әлі жасалмаған</span>
      </div>
    )
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-3">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide shrink-0">
        Тест банкі
      </span>
      <select
        value={selectedBankId}
        onChange={(e) => setSelectedBankId(e.target.value)}
        className="px-2.5 py-1 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {banks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} — {b.quarter} тоқс. {b.academicYear}–{b.academicYear + 1}
          </option>
        ))}
      </select>
    </div>
  )
}
