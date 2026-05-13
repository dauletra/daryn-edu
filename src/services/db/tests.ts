import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  arrayRemove,
  deleteField,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { Test, ClassLevel } from '@/types'
import { generateTestTitle } from '@/utils/testTitle'

export async function getTests(): Promise<Test[]> {
  const snap = await getDocs(query(collection(db, 'tests'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Test)
}

export async function getTestsByCreator(creatorId: string): Promise<Test[]> {
  const q = query(
    collection(db, 'tests'),
    where('createdBy', '==', creatorId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Test)
}

export async function getTest(testId: string): Promise<Test | null> {
  const docSnap = await getDoc(doc(db, 'tests', testId))
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Test
}

export async function createTest(data: {
  testBankId: string
  classLevel: ClassLevel
  subjectId: string
  subject: string
  language: string
  variantNumber: number
  createdBy: string
  timeLimit: number
  questionCount: number
}): Promise<string> {
  const title = generateTestTitle(data)
  const docRef = await addDoc(collection(db, 'tests'), {
    ...data,
    title,
    published: false,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateTest(
  id: string,
  data: Partial<Pick<Test, 'testBankId' | 'classLevel' | 'subject' | 'subjectId' | 'language' | 'variantNumber' | 'timeLimit' | 'questionCount' | 'published' | 'title'>>
): Promise<void> {
  await updateDoc(doc(db, 'tests', id), data)
}

function generateShareToken(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 10; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export async function openTestAccess(testId: string): Promise<string> {
  const token = generateShareToken()
  await updateDoc(doc(db, 'tests', testId), { shareToken: token })
  return token
}

export async function closeTestAccess(testId: string): Promise<void> {
  await updateDoc(doc(db, 'tests', testId), { shareToken: deleteField() })
}

export async function deleteTest(id: string): Promise<void> {
  const questionsSnap = await getDocs(collection(db, 'tests', id, 'questions'))
  const batch = writeBatch(db)
  questionsSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'tests', id))
  await batch.commit()

  const classesSnap = await getDocs(
    query(collection(db, 'classes'), where('assignedTests', 'array-contains', id))
  )
  if (classesSnap.size > 0) {
    const cleanupBatch = writeBatch(db)
    classesSnap.docs.forEach((classDoc) => {
      cleanupBatch.update(classDoc.ref, { assignedTests: arrayRemove(id) })
    })
    await cleanupBatch.commit()
  }
}
