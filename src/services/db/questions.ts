import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  documentId,
  where,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { Question } from '@/types'

export async function getQuestions(testId: string): Promise<Question[]> {
  const snap = await getDocs(
    query(collection(db, 'tests', testId, 'questions'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question)
}

export async function getQuestionsByIds(testId: string, questionIds: string[]): Promise<Question[]> {
  if (questionIds.length === 0) return []
  const chunks: string[][] = []
  for (let i = 0; i < questionIds.length; i += 30) {
    chunks.push(questionIds.slice(i, i + 30))
  }
  const results: Question[] = []
  for (const chunk of chunks) {
    const q = query(
      collection(db, 'tests', testId, 'questions'),
      where(documentId(), 'in', chunk)
    )
    const snap = await getDocs(q)
    results.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question))
  }
  return results
}

export async function addQuestions(
  testId: string,
  questions: { text: string; options: string[]; correctIndex: number }[]
): Promise<void> {
  const batch = writeBatch(db)
  for (const q of questions) {
    const ref = doc(collection(db, 'tests', testId, 'questions'))
    batch.set(ref, {
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      createdAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

export async function addQuestion(
  testId: string,
  data: { text: string; options: string[]; correctIndex: number }
): Promise<string> {
  const docRef = await addDoc(collection(db, 'tests', testId, 'questions'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateQuestion(
  testId: string,
  questionId: string,
  data: Partial<Pick<Question, 'text' | 'options' | 'correctIndex'>>
): Promise<void> {
  await updateDoc(doc(db, 'tests', testId, 'questions', questionId), data)
}

export async function deleteQuestion(testId: string, questionId: string): Promise<void> {
  await deleteDoc(doc(db, 'tests', testId, 'questions', questionId))
}

export async function getQuestionsCount(testId: string): Promise<number> {
  const snap = await getDocs(collection(db, 'tests', testId, 'questions'))
  return snap.size
}
