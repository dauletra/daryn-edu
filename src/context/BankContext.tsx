import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTestBanks } from '@/services/db'
import type { TestBank } from '@/types'

const STORAGE_KEY = 'educore_selected_bank_id'

interface BankContextValue {
  banks: TestBank[]
  selectedBankId: string
  selectedBank: TestBank | null
  setSelectedBankId: (id: string) => void
  loading: boolean
}

const BankContext = createContext<BankContextValue | null>(null)

export function BankProvider({ children }: { children: ReactNode }) {
  const { data: banks, loading } = useFirestoreQuery(() => getTestBanks())

  const [selectedBankId, setSelectedBankIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  })

  // Auto-select the most recent bank if nothing saved or saved bank no longer exists
  useEffect(() => {
    if (!banks) return
    if (banks.length === 0) {
      setSelectedBankIdState('')
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && banks.some((b) => b.id === saved)) return
    // getTestBanks returns ordered by createdAt desc — first is most recent
    const latest = banks[0]
    setSelectedBankIdState(latest.id)
    localStorage.setItem(STORAGE_KEY, latest.id)
  }, [banks])

  const setSelectedBankId = (id: string) => {
    setSelectedBankIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const selectedBank = banks?.find((b) => b.id === selectedBankId) ?? null

  return (
    <BankContext.Provider
      value={{
        banks: banks ?? [],
        selectedBankId,
        selectedBank,
        setSelectedBankId,
        loading,
      }}
    >
      {children}
    </BankContext.Provider>
  )
}

export function useBank() {
  const ctx = useContext(BankContext)
  if (!ctx) throw new Error('useBank must be used within BankProvider')
  return ctx
}
