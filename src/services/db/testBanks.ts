import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { Test, TestBank } from '@/types'

export async function getTestBanks(): Promise<TestBank[]> {
  const snap = await getDocs(query(collection(db, 'testBanks'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestBank)
}

export async function getTestBank(id: string): Promise<TestBank | null> {
  const docSnap = await getDoc(doc(db, 'testBanks', id))
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as TestBank
}

export async function createTestBank(data: {
  name: string
  quarter: 1 | 2 | 3 | 4
  academicYear: number
}): Promise<string> {
  const docRef = await addDoc(collection(db, 'testBanks'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateTestBank(
  id: string,
  data: Partial<Pick<TestBank, 'name' | 'quarter' | 'academicYear'>>
): Promise<void> {
  await updateDoc(doc(db, 'testBanks', id), data)
}

export async function deleteTestBank(id: string): Promise<void> {
  const testsSnap = await getDocs(query(collection(db, 'tests'), where('testBankId', '==', id)))
  if (testsSnap.size > 0) {
    throw new Error('Невозможно удалить банк, в котором есть тесты')
  }
  await deleteDoc(doc(db, 'testBanks', id))
}

export async function getTestsByBank(bankId: string): Promise<Test[]> {
  const q = query(
    collection(db, 'tests'),
    where('testBankId', '==', bankId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Test)
}
