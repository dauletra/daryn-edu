import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

interface GeneratedQuestion {
  text: string
  options: string[]
  correctIndex: number
}

interface GenerateResponse {
  questions: GeneratedQuestion[]
}

const generateQuestionsFn = httpsCallable<
  { topic: string; level: string; subject: string; count: number; language: string },
  GenerateResponse
>(functions, 'generateQuestions', { timeout: 120000 })

export async function generateQuestions(
  topic: string,
  level: string,
  subject: string,
  count: number = 10,
  language: string = 'ru'
): Promise<GeneratedQuestion[]> {
  const result = await generateQuestionsFn({ topic, level, subject, count, language })
  return result.data.questions
}

// === Анықтама (отчёт по параллели / банку) ===

export interface ReportClassStat {
  className: string
  studentsTotal: number
  studentsTook: number
  avgScore: number
  passRate: number
}

export interface ReportSubjectStat {
  subject: string
  studentsTook: number
  avgScore: number
  passRate: number
}

export interface ReportClassSubjectCell {
  className: string
  subject: string
  avgScore: number
  studentsTook: number
}

export interface ReportStudentStat {
  name: string
  className: string
  avgScore: number
  attempts: number
  subjects: Array<{ subject: string; score: number }>
}

export interface ReportPayload {
  scope: 'parallel' | 'bank'
  bankTitle: string
  classLevel?: number
  period: string
  overall: {
    studentsTotal: number
    studentsTook: number
    avgScore: number
    passRate: number
    gradeDistribution: { grade5: number; grade4: number; grade3: number; grade2: number }
  }
  byClass: ReportClassStat[]
  bySubject: ReportSubjectStat[]
  byClassSubject: ReportClassSubjectCell[]
  byStudent: ReportStudentStat[]
  customInstructions?: string
}

const generateReportFn = httpsCallable<{ data: ReportPayload }, { text: string }>(
  functions,
  'generateReport',
  { timeout: 180000 }
)

export async function generateReport(payload: ReportPayload): Promise<string> {
  const result = await generateReportFn({ data: payload })
  return result.data.text
}
