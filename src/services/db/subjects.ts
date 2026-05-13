import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { Subject } from '@/types'

export async function getSubjects(): Promise<Subject[]> {
  const snap = await getDocs(query(collection(db, 'subjects'), orderBy('name')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Subject)
}

export async function createSubject(name: string, createdBy: string): Promise<string> {
  const docRef = await addDoc(collection(db, 'subjects'), {
    name,
    createdBy,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function deleteSubject(id: string): Promise<void> {
  await deleteDoc(doc(db, 'subjects', id))
}
