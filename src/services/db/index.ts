/**
 * Firestore data layer — re-export per domain.
 *
 *   users      — getUsers, createModerator, createStudent, deleteStudents, ...
 *   subjects   — getSubjects, createSubject, deleteSubject
 *   classes    — getClasses, createClass, addStudentToClass, getAssignedTests, ...
 *   testBanks  — getTestBanks, createTestBank, getTestsByBank, ...
 *   tests      — getTests, createTest, openTestAccess, deleteTest, ...
 *   questions  — getQuestions, addQuestions, updateQuestion, ...
 *   results    — getResult, getResultsByBankAndClass, resetStudentTestAccess, ...
 *   absences   — markStudentAbsence, getAbsencesByTest, removeAbsence
 *   functions  — startTestFn, submitTestFn, cleanupOldResultsFn (callable wrappers)
 */
export * from './users'
export * from './subjects'
export * from './classes'
export * from './testBanks'
export * from './tests'
export * from './questions'
export * from './results'
export * from './absences'
export * from './functions'

// Re-exported helpers used directly by some pages.
export { serverTimestamp } from 'firebase/firestore'
export type { Answer } from '@/types'
