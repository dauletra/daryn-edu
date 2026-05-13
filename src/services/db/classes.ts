import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { Class, Test } from '@/types'

export async function getClasses(): Promise<Class[]> {
  const snap = await getDocs(collection(db, 'classes'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Class)
}

export async function getClass(classId: string): Promise<Class | null> {
  const docSnap = await getDoc(doc(db, 'classes', classId))
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Class
}

export async function createClass(name: string, createdBy: string): Promise<string> {
  const match = name.match(/^(\d+)/)
  const level = match ? parseInt(match[1], 10) : undefined
  const classLevel = level && [7, 8, 9, 10, 11].includes(level) ? level : undefined
  const docRef = await addDoc(collection(db, 'classes'), {
    name,
    ...(classLevel !== undefined && { classLevel }),
    studentIds: [],
    assignedTests: [],
    createdBy,
  })
  return docRef.id
}

export async function updateClass(id: string, data: Partial<Pick<Class, 'name' | 'activeBankId'>>): Promise<void> {
  await updateDoc(doc(db, 'classes', id), data)
}

export async function deleteClass(id: string): Promise<void> {
  const classDoc = await getDoc(doc(db, 'classes', id))
  if (classDoc.exists()) {
    const studentIds: string[] = classDoc.data().studentIds ?? []
    if (studentIds.length > 0) {
      const batch = writeBatch(db)
      studentIds.forEach((uid) => {
        batch.update(doc(db, 'users', uid), { classId: '' })
      })
      await batch.commit()
    }
  }
  await deleteDoc(doc(db, 'classes', id))
}

export async function addStudentToClass(classId: string, studentId: string): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), {
    studentIds: arrayUnion(studentId),
  })
  await updateDoc(doc(db, 'users', studentId), { classId })
}

export async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), {
    studentIds: arrayRemove(studentId),
  })
  await updateDoc(doc(db, 'users', studentId), { classId: '' })
}

export async function assignTestToClass(classId: string, testId: string): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), {
    assignedTests: arrayUnion(testId),
  })
}

export async function removeTestFromClass(classId: string, testId: string): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), {
    assignedTests: arrayRemove(testId),
  })
}

/** Tests visible to a student in their class (published, optionally filtered by activeBank). */
export async function getAssignedTests(classId: string): Promise<Test[]> {
  if (!classId) return []

  const classDoc = await getDoc(doc(db, 'classes', classId))
  if (!classDoc.exists()) return []
  const classData = classDoc.data() as Omit<Class, 'id'>

  const testIds: string[] = classData.assignedTests ?? []
  if (testIds.length === 0) return []

  const results: Test[] = []
  for (const testId of testIds) {
    const testDoc = await getDoc(doc(db, 'tests', testId))
    if (testDoc.exists()) {
      const test = { id: testDoc.id, ...testDoc.data() } as Test
      if (test.published) {
        results.push(test)
      }
    }
  }
  if (classData.activeBankId) {
    return results.filter((t) => t.testBankId === classData.activeBankId)
  }
  return results
}
