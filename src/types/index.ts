import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'moderator' | 'student'

export type ClassLevel = 7 | 8 | 9 | 10 | 11

export const LANGUAGES = [
  { value: 'kz', label: 'Қазақша' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
] as const

export type Language = typeof LANGUAGES[number]['value']

/** Fields shared by every user role. */
interface BaseUser {
  uid: string
  name: string
  email: string
  createdAt: Timestamp | Date
}

export interface AdminUser extends BaseUser {
  role: 'admin'
}

export interface ModeratorUser extends BaseUser {
  role: 'moderator'
  /** Set by admin to revoke access without deleting the account. */
  disabled?: boolean
}

export interface StudentUser extends BaseUser {
  role: 'student'
  /** Empty string when student has been removed from a class. */
  classId?: string
  /** Stored plain so admins/moderators can hand out credentials; never expose to other students. */
  plainPassword?: string
}

/**
 * Discriminated union over `role`.
 * Narrow with `user.role === 'student'` or the `isStudent`/`isModerator`/`isAdmin` helpers below.
 */
export type AppUser = AdminUser | ModeratorUser | StudentUser

export const isAdmin = (u: AppUser): u is AdminUser => u.role === 'admin'
export const isModerator = (u: AppUser): u is ModeratorUser => u.role === 'moderator'
export const isStudent = (u: AppUser): u is StudentUser => u.role === 'student'

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
  createdBy?: string
  activeBankId?: string
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
  shareToken?: string
  timeLimit: number
  questionCount: number
  allowCalculator?: boolean
  allowPeriodicTable?: boolean
  allowSolubilityTable?: boolean
  allowActivitySeries?: boolean
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

/** Anti-cheating audit events appended to TestResult.events during testing. */
export type TestEventType =
  | 'fullscreen_exit'
  | 'tab_hidden'
  | 'window_blur'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'context_menu'
  | 'back_attempt'
  | 'devtools_shortcut'
  | 'print_attempt'

export interface TestEvent {
  type: TestEventType
  at: Timestamp | Date
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
  /** What the student sees — shuffled options, stored once at test start */
  shuffledQuestions?: StudentQuestion[]
  /** map[shuffledPos] = originalPos — used only for server-side grading */
  optionsMap?: Record<string, number[]>
  answers: Answer[]
  /** Audit trail of anti-cheating events (tab switches, copy attempts, etc.). */
  events?: TestEvent[]
  wrongQuestionIds: string[]
  correctCount: number
  score: number
}
