import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'moderator' | 'student'

export type ClassLevel = 7 | 8 | 9 | 10 | 11

export const LANGUAGES = [
  { value: 'kz', label: 'Қазақша' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
] as const

export type Language = typeof LANGUAGES[number]['value']

export interface AppUser {
  uid: string
  name: string
  email: string
  role: UserRole
  classId?: string
  disabled?: boolean
  plainPassword?: string
  createdAt: Timestamp | Date
}

export interface Subject {
  id: string
  name: string
  createdBy: string
  createdAt: Timestamp | Date
}

export interface Class {
  id: string
  name: string
  classLevel?: ClassLevel
  studentIds: string[]
  assignedTests: string[]
}

export interface TestBank {
  id: string
  name: string
  quarter: 1 | 2 | 3 | 4
  academicYear: number
  createdAt: Timestamp | Date
}

export interface Test {
  id: string
  title: string
  testBankId: string
  classLevel: ClassLevel
  subject: string
  subjectId: string
  language: string
  variantNumber: number
  createdBy: string
  published: boolean
  timeLimit: number
  questionCount: number
  createdAt: Timestamp | Date
}

export interface StudentAbsence {
  id: string
  studentId: string
  classId: string
  testId: string
  reason: string
  markedBy: string
  createdAt: Timestamp | Date
}

export interface Question {
  id: string
  text: string
  options: string[]
  correctIndex: number
  createdAt: Timestamp | Date
}

/** Question data sent to students (no correctIndex) */
export interface StudentQuestion {
  id: string
  text: string
  options: string[]
}

export interface Answer {
  questionId: string
  selectedIndex: number
  correct?: boolean // Set server-side during grading
}

export interface TestResult {
  id: string
  testId: string
  studentId: string
  classId: string
  quarter: string
  year: number
  // Denormalized from Test for analytics queries
  classLevel: ClassLevel
  subjectId: string
  subject: string
  testBankId: string
  startedAt: Timestamp | Date
  submittedAt?: Timestamp | Date
  status: 'in_progress' | 'completed'
  questionIds: string[]
  answers: Answer[]
  wrongQuestionIds: string[]
  correctCount: number
  score: number
}
