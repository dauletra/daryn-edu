import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { TestResult } from '@/types'

// NOTE: createResult() is intentionally absent.
// Result documents are created exclusively by the startTest Cloud Function,
// which ensures shuffledQuestions and optionsMap are always present.

export async function getResult(studentId: string, testId: string): Promise<TestResult | null> {
  const docSnap = await getDoc(doc(db, 'results', `${studentId}_${testId}`))
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as TestResult
}

export async function updateResult(
  resultId: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(db, 'results', resultId), data)
}

export async function getResultsByTest(testId: string): Promise<TestResult[]> {
  const q = query(collection(db, 'results'), where('testId', '==', testId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestResult)
}

export async function getResultsByStudent(studentId: string): Promise<TestResult[]> {
  const q = query(collection(db, 'results'), where('studentId', '==', studentId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestResult)
}

export async function getActiveResultsForTest(testId: string): Promise<TestResult[]> {
  const q = query(
    collection(db, 'results'),
    where('testId', '==', testId),
    where('status', '==', 'in_progress')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestResult)
}

export async function getResultsByClass(classId: string): Promise<TestResult[]> {
  const q = query(
    collection(db, 'results'),
    where('classId', '==', classId),
    where('status', '==', 'completed')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestResult)
}

export async function getResultsByBank(testBankId: string): Promise<TestResult[]> {
  const q = query(
    collection(db, 'results'),
    where('status', '==', 'completed'),
    where('testBankId', '==', testBankId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestResult)
}

export async function getResultsByBankAndClass(
  testBankId: string,
  classId: string
): Promise<TestResult[]> {
  const q = query(
    collection(db, 'results'),
    where('status', '==', 'completed'),
    where('testBankId', '==', testBankId),
    where('classId', '==', classId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestResult)
}

export async function getResultsByBankAndClassLevel(
  testBankId: string,
  classLevel: number
): Promise<TestResult[]> {
  const q = query(
    collection(db, 'results'),
    where('status', '==', 'completed'),
    where('testBankId', '==', testBankId),
    where('classLevel', '==', classLevel)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestResult)
}

export async function resetStudentTestAccess(studentId: string, testId: string): Promise<void> {
  const resultId = `${studentId}_${testId}`
  await deleteDoc(doc(db, 'results', resultId))
}
