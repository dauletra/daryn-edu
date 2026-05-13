import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { db, secondaryAuth } from '@/services/firebase'
import type { AppUser, AdminUser, ModeratorUser, StudentUser, Class } from '@/types'
import { generateEmailFromName, generatePassword } from '@/utils/transliterate'

// Overloads: callers passing a role get the precise narrowed array type.
export function getUsers(): Promise<AppUser[]>
export function getUsers(role: 'student'): Promise<StudentUser[]>
export function getUsers(role: 'moderator'): Promise<ModeratorUser[]>
export function getUsers(role: 'admin'): Promise<AdminUser[]>
export async function getUsers(role?: string): Promise<AppUser[]> {
  const q = role
    ? query(collection(db, 'users'), where('role', '==', role))
    : query(collection(db, 'users'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser)
}

export async function getUser(uid: string): Promise<AppUser | null> {
  const docSnap = await getDoc(doc(db, 'users', uid))
  if (!docSnap.exists()) return null
  return { uid: docSnap.id, ...docSnap.data() } as AppUser
}

async function createUserAccount(email: string, password: string): Promise<string> {
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
  await secondaryAuth.signOut()
  return credential.user.uid
}

export async function createModerator(name: string, email: string, password: string): Promise<string> {
  const uid = await createUserAccount(email, password)
  await setDoc(doc(db, 'users', uid), {
    name,
    email,
    role: 'moderator',
    createdAt: serverTimestamp(),
  })
  return uid
}

export async function toggleModeratorStatus(uid: string, disabled: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { disabled })
}

export async function createStudent(
  name: string,
  email: string,
  password: string,
  classId: string
): Promise<{ uid: string; email: string }> {
  let uid: string
  let actualEmail = email
  try {
    uid = await createUserAccount(actualEmail, password)
  } catch (err: unknown) {
    // Email taken (possibly by a deleted student or a namesake) — add random suffix
    if (err instanceof Error && err.message.includes('email-already-in-use')) {
      const suffix = Math.random().toString(36).slice(2, 6)
      actualEmail = email.replace('@', `.${suffix}@`)
      uid = await createUserAccount(actualEmail, password)
    } else {
      throw err
    }
  }
  await setDoc(doc(db, 'users', uid), {
    name,
    email: actualEmail,
    role: 'student',
    classId,
    plainPassword: password,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'classes', classId), {
    studentIds: arrayUnion(uid),
  })
  return { uid, email: actualEmail }
}

export async function createStudentsBulk(
  names: string[],
  classId: string
): Promise<{ created: { name: string; email: string; password: string }[]; errors: string[]; skipped: string[] }> {
  const created: { name: string; email: string; password: string }[] = []
  const errors: string[] = []
  const skipped: string[] = []

  // Get existing students in this class to check for duplicates by name
  const classDoc = await getDoc(doc(db, 'classes', classId))
  const classData = classDoc.exists() ? (classDoc.data() as Omit<Class, 'id'>) : null
  const existingStudentIds: string[] = classData?.studentIds ?? []

  const existingNames = new Set<string>()
  if (existingStudentIds.length > 0) {
    // Fetch in chunks of 30 (Firestore 'in' limit)
    for (let i = 0; i < existingStudentIds.length; i += 30) {
      const chunk = existingStudentIds.slice(i, i + 30)
      const snap = await getDocs(query(collection(db, 'users'), where('__name__', 'in', chunk)))
      snap.docs.forEach((d) => {
        const data = d.data() as Omit<AppUser, 'uid'>
        existingNames.add(data.name.toLowerCase().trim())
      })
    }
  }

  let emailIndex = 0
  for (let i = 0; i < names.length; i++) {
    const fullName = names[i].trim()
    if (!fullName) continue

    // Check if student with this name already exists in the class
    if (existingNames.has(fullName.toLowerCase())) {
      skipped.push(fullName)
      continue
    }

    // Also skip duplicates within the same bulk input
    if (existingNames.has(fullName.toLowerCase())) continue
    existingNames.add(fullName.toLowerCase())

    emailIndex++
    const parts = fullName.split(/\s+/)
    const surname = parts[0] || ''
    const firstName = parts.slice(1).join(' ') || surname
    const email = generateEmailFromName(surname, firstName, emailIndex)
    const password = generatePassword()

    try {
      const result = await createStudent(fullName, email, password, classId)
      created.push({ name: fullName, email: result.email, password })
    } catch (err) {
      errors.push(`${fullName}: ${err instanceof Error ? err.message : 'Ошибка'}`)
    }
  }

  return { created, errors, skipped }
}

export async function updateUser(uid: string, data: { name?: string; classId?: string }): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data)
}

export async function deleteStudents(uids: string[]): Promise<void> {
  // Remove students from their classes
  const classesSnap = await getDocs(collection(db, 'classes'))
  for (const classDoc of classesSnap.docs) {
    const classData = classDoc.data() as Omit<Class, 'id'>
    const overlap = (classData.studentIds || []).filter((id) => uids.includes(id))
    if (overlap.length > 0) {
      const batch = writeBatch(db)
      for (const uid of overlap) {
        batch.update(classDoc.ref, { studentIds: arrayRemove(uid) })
      }
      await batch.commit()
    }
  }

  // Delete results
  for (const uid of uids) {
    const resultsSnap = await getDocs(query(collection(db, 'results'), where('studentId', '==', uid)))
    if (resultsSnap.size > 0) {
      const batch = writeBatch(db)
      resultsSnap.docs.forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }

  // Delete user documents
  const batch = writeBatch(db)
  for (const uid of uids) {
    batch.delete(doc(db, 'users', uid))
  }
  await batch.commit()
}
