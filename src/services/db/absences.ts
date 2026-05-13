import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { StudentAbsence } from '@/types'

export async function markStudentAbsence(data: {
  studentId: string
  classId: string
  testId: string
  reason: string
  markedBy: string
}): Promise<string> {
  const docRef = await addDoc(collection(db, 'absences'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getAbsencesByTest(testId: string): Promise<StudentAbsence[]> {
  const q = query(collection(db, 'absences'), where('testId', '==', testId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudentAbsence)
}

export async function removeAbsence(id: string): Promise<void> {
  await deleteDoc(doc(db, 'absences', id))
}
