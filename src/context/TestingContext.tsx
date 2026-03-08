import { createContext, useContext, useState } from 'react'

interface TestingContextValue {
  isTestingActive: boolean
  setIsTestingActive: (value: boolean) => void
}

const TestingContext = createContext<TestingContextValue>({
  isTestingActive: false,
  setIsTestingActive: () => {},
})

export function TestingProvider({ children }: { children: React.ReactNode }) {
  const [isTestingActive, setIsTestingActive] = useState(false)
  return (
    <TestingContext.Provider value={{ isTestingActive, setIsTestingActive }}>
      {children}
    </TestingContext.Provider>
  )
}

export function useTesting() {
  return useContext(TestingContext)
}
