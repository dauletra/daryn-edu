import { httpsCallable } from 'firebase/functions'
import { functions } from '@/services/firebase'
import type { StudentQuestion } from '@/types'

// ---- startTest / submitTest (used by TestTakingPage) ----

export interface StartTestResponse {
  phase: 'testing' | 'finished' | 'already_completed'
  resultId?: string
  questions?: StudentQuestion[]
  answers?: { questionId: string; selectedIndex: number }[]
  remainingSeconds?: number
  score?: number
  correctCount?: number
  total?: number
}

export interface SubmitTestResponse {
  score: number
  correctCount: number
  total: number
}

const startTestCallable = httpsCallable<{ testId: string }, StartTestResponse>(functions, 'startTest')
const submitTestCallable = httpsCallable<
  { resultId: string; answers: { questionId: string; selectedIndex: number }[] },
  SubmitTestResponse
>(functions, 'submitTest')

export async function startTestFn(testId: string): Promise<StartTestResponse> {
  const result = await startTestCallable({ testId })
  return result.data
}

export async function submitTestFn(
  resultId: string,
  answers: { questionId: string; selectedIndex: number }[]
): Promise<SubmitTestResponse> {
  const result = await submitTestCallable({ resultId, answers })
  return result.data
}

// ---- cleanupOldResults (admin only) ----

interface CleanupOldResultsResponse {
  dryRun: boolean
  found?: number
  deleted?: number
  total: number
  ids?: string[]
}

const cleanupOldResultsCallable = httpsCallable<
  { dryRun?: boolean },
  CleanupOldResultsResponse
>(functions, 'cleanupOldResults')

export async function cleanupOldResultsFn(dryRun = false): Promise<CleanupOldResultsResponse> {
  const result = await cleanupOldResultsCallable({ dryRun })
  return result.data
}
