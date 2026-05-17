import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTestBanks } from '@/services/db'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'

export function ReportHomePage() {
  const navigate = useNavigate()
  const { data: banks, loading } = useFirestoreQuery(() => getTestBanks())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function goCompare() {
    if (selectedIds.size < 2) return
    const ids = Array.from(selectedIds).join(',')
    navigate(`/admin/report/compare?banks=${ids}`)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Анықтама</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Анықтама жасау үшін тест банкін таңдаңыз. Бірнеше банкті белгілеп,
        салыстырмалы анықтама да жасауға болады.
      </p>

      {!banks || banks.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          Тест банктары әлі жасалмаған
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank) => {
            const checked = selectedIds.has(bank.id)
            return (
              <div
                key={bank.id}
                className={`relative bg-white rounded-xl shadow-sm border-2 transition-colors ${
                  checked ? 'border-blue-500' : 'border-transparent hover:border-gray-200'
                }`}
              >
                <label className="absolute top-3 right-3 z-10 flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(bank.id)}
                    className="w-4 h-4 cursor-pointer accent-blue-600"
                  />
                </label>

                <Link
                  to={`/admin/report/bank/${bank.id}`}
                  className="block p-5 pr-12"
                >
                  <div className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {bank.name}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                    <span>{bank.quarter}-тоқсан</span>
                    <span>·</span>
                    <span>
                      {bank.academicYear}–{bank.academicYear + 1} оқу жылы
                    </span>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {selectedIds.size >= 2 && (
        <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            <span className="font-semibold">{selectedIds.size}</span> банк таңдалды
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
              Тазалау
            </Button>
            <Button onClick={goCompare}>Салыстырмалы анықтама жасау</Button>
          </div>
        </div>
      )}
    </div>
  )
}
