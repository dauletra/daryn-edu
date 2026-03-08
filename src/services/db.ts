import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  documentId,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { db, secondaryAuth } from './firebase'
import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import type { AppUser, Class, Test, TestBank, Question, TestResult, Answer, StudentQuestion, Subject, StudentAbsence, ClassLevel } from '@/types'
import { generateTestTitle } from '@/utils/testTitle'
import { generateEmailFromName, generatePassword } from '@/utils/transliterate'

// ---- Users ----

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

export async function updateUser(uid: string, data: Partial<Pick<AppUser, 'name' | 'classId'>>): Promise<void> {
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

// ---- Subjects ----

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

// ---- Classes ----

export async function getClasses(): Promise<Class[]> {
  const snap = await getDocs(collection(db, 'classes'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Class)
}

export async function getClass(classId: string): Promise<Class | null> {
  const docSnap = await getDoc(doc(db, 'classes', classId))
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Class
}

export async function createClass(name: string): Promise<string> {
  const match = name.match(/^(\d+)/)
  const level = match ? parseInt(match[1], 10) : undefined
  const classLevel = level && [7, 8, 9, 10, 11].includes(level) ? level : undefined
  const docRef = await addDoc(collection(db, 'classes'), {
    name,
    ...(classLevel !== undefined && { classLevel }),
    studentIds: [],
    assignedTests: [],
  })
  return docRef.id
}

export async function updateClass(id: string, data: Partial<Pick<Class, 'name'>>): Promise<void> {
  await updateDoc(doc(db, 'classes', id), data)
}

export async function deleteClass(id: string): Promise<void> {
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

export async function assignTestToClass(
  classId: string,
  testId: string
): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), {
    assignedTests: arrayUnion(testId),
  })
}

export async function removeTestFromClass(classId: string, testId: string): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), {
    assignedTests: arrayRemove(testId),
  })
}

// ---- Test Banks ----

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

// ---- Tests ----

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

export async function deleteTest(id: string): Promise<void> {
  const questionsSnap = await getDocs(collection(db, 'tests', id, 'questions'))
  const batch = writeBatch(db)
  questionsSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'tests', id))
  await batch.commit()
}

// ---- Questions (subcollection) ----

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

// ---- Results ----

export async function createResult(data: {
  testId: string
  studentId: string
  classId: string
  quarter: string
  year: number
  questionIds: string[]
  classLevel: ClassLevel
  subjectId: string
  subject: string
  testBankId: string
}): Promise<string> {
  const id = `${data.studentId}_${data.testId}`
  await setDoc(doc(db, 'results', id), {
    ...data,
    startedAt: serverTimestamp(),
    status: 'in_progress',
    answers: [],
    wrongQuestionIds: [],
    correctCount: 0,
    score: 0,
  })
  return id
}

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

export async function getAllResults(): Promise<TestResult[]> {
  const q = query(collection(db, 'results'), where('status', '==', 'completed'))
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

export async function resetStudentTestAccess(studentId: string, testId: string): Promise<void> {
  const resultId = `${studentId}_${testId}`
  await deleteDoc(doc(db, 'results', resultId))
}

// ---- Absences ----

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

// ---- Assigned Tests (for students) ----

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
  return results
}

// ---- Cloud Function callables for test-taking ----

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
const submitTestCallable = httpsCallable<{ resultId: string; answers: { questionId: string; selectedIndex: number }[] }, SubmitTestResponse>(functions, 'submitTest')

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

export { serverTimestamp }
export type { Answer }
