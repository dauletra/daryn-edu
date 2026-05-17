import type { TestResult, Class, StudentUser, ClassLevel, TestBank } from '@/types'

const PASS_THRESHOLD = 40
const CLASS_LEVELS: ClassLevel[] = [7, 8, 9, 10, 11]

function round(n: number): number {
  return Math.round(n)
}

function avgScore(results: TestResult[]): number {
  if (results.length === 0) return 0
  return round(results.reduce((a, r) => a + r.score, 0) / results.length)
}

function passRate(results: TestResult[]): number {
  if (results.length === 0) return 0
  const passed = results.filter((r) => r.score >= PASS_THRESHOLD).length
  return round((passed / results.length) * 100)
}

export interface CompareParallelStat {
  classLevel: ClassLevel
  studentsTook: number
  avgScore: number
  passRate: number
}

export interface CompareSubjectStat {
  subject: string
  studentsTook: number
  avgScore: number
  passRate: number
}

export interface CompareBankStat {
  id: string
  name: string
  quarter: 1 | 2 | 3 | 4
  academicYear: number
  period: string
  overall: {
    studentsTotal: number
    studentsTook: number
    avgScore: number
    passRate: number
  }
  byParallel: CompareParallelStat[]
  bySubject: CompareSubjectStat[]
}

export interface CompareReportPayload {
  banks: CompareBankStat[]
  /** Sorted union of parallels that appear in at least one bank. */
  parallels: ClassLevel[]
  /** Sorted union of subjects that appear in at least one bank. */
  subjects: string[]
}

interface ComputeInput {
  banks: TestBank[]
  resultsByBankId: Record<string, TestResult[]>
  classes: Class[]
  students: StudentUser[]
}

function formatPeriod(bank: TestBank): string {
  return `${bank.academicYear}–${bank.academicYear + 1} оқу жылы, ${bank.quarter}-тоқсан`
}

/** Earlier first: by academicYear, then quarter. */
function compareChronological(a: TestBank, b: TestBank): number {
  if (a.academicYear !== b.academicYear) return a.academicYear - b.academicYear
  return a.quarter - b.quarter
}

function computeBankStat(
  bank: TestBank,
  results: TestResult[],
  studentsTotal: number
): CompareBankStat {
  const studentsTook = new Set(results.map((r) => r.studentId)).size

  const byParallel = CLASS_LEVELS.map((level): CompareParallelStat | null => {
    const levelResults = results.filter((r) => r.classLevel === level)
    if (levelResults.length === 0) return null
    return {
      classLevel: level,
      studentsTook: new Set(levelResults.map((r) => r.studentId)).size,
      avgScore: avgScore(levelResults),
      passRate: passRate(levelResults),
    }
  }).filter((row): row is CompareParallelStat => row !== null)

  const subjectGroups = new Map<string, TestResult[]>()
  for (const r of results) {
    if (!r.subject) continue
    if (!subjectGroups.has(r.subject)) subjectGroups.set(r.subject, [])
    subjectGroups.get(r.subject)!.push(r)
  }
  const bySubject: CompareSubjectStat[] = Array.from(subjectGroups.entries())
    .map(([subject, subResults]) => ({
      subject,
      studentsTook: new Set(subResults.map((r) => r.studentId)).size,
      avgScore: avgScore(subResults),
      passRate: passRate(subResults),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject))

  return {
    id: bank.id,
    name: bank.name,
    quarter: bank.quarter,
    academicYear: bank.academicYear,
    period: formatPeriod(bank),
    overall: {
      studentsTotal,
      studentsTook,
      avgScore: avgScore(results),
      passRate: passRate(results),
    },
    byParallel,
    bySubject,
  }
}

export function computeCompareReport(input: ComputeInput): CompareReportPayload {
  const studentsTotal = input.students.length

  const sortedBanks = [...input.banks].sort(compareChronological)

  const banks: CompareBankStat[] = sortedBanks.map((bank) =>
    computeBankStat(bank, input.resultsByBankId[bank.id] ?? [], studentsTotal)
  )

  const parallelSet = new Set<ClassLevel>()
  const subjectSet = new Set<string>()
  for (const b of banks) {
    for (const p of b.byParallel) parallelSet.add(p.classLevel)
    for (const s of b.bySubject) subjectSet.add(s.subject)
  }

  const parallels = Array.from(parallelSet).sort((a, b) => a - b)
  const subjects = Array.from(subjectSet).sort((a, b) => a.localeCompare(b))

  return { banks, parallels, subjects }
}

export function getBankParallel(
  bank: CompareBankStat,
  classLevel: ClassLevel
): CompareParallelStat | null {
  return bank.byParallel.find((p) => p.classLevel === classLevel) ?? null
}

export function getBankSubject(
  bank: CompareBankStat,
  subject: string
): CompareSubjectStat | null {
  return bank.bySubject.find((s) => s.subject === subject) ?? null
}
