import type { TestResult, Class, StudentUser, ClassLevel } from '@/types'
import { getGrade } from '@/utils/scoreUtils'
import type {
  ReportPayload,
  ReportClassStat,
  ReportSubjectStat,
  ReportClassSubjectCell,
  ReportStudentStat,
} from '@/services/claude'

const PASS_THRESHOLD = 40

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

function gradeDistribution(results: TestResult[]): {
  grade5: number
  grade4: number
  grade3: number
  grade2: number
} {
  let g5 = 0,
    g4 = 0,
    g3 = 0,
    g2 = 0
  for (const r of results) {
    const g = getGrade(r.score)
    if (g === 5) g5++
    else if (g === 4) g4++
    else if (g === 3) g3++
    else g2++
  }
  return { grade5: g5, grade4: g4, grade3: g3, grade2: g2 }
}

function computeByClass(
  results: TestResult[],
  classes: Class[],
  students: StudentUser[]
): ReportClassStat[] {
  return classes
    .map((cls): ReportClassStat | null => {
      const classResults = results.filter((r) => r.classId === cls.id)
      if (classResults.length === 0) return null
      const studentsTotal = students.filter((s) => s.classId === cls.id).length
      const studentsTook = new Set(classResults.map((r) => r.studentId)).size
      return {
        className: cls.name,
        studentsTotal,
        studentsTook,
        avgScore: avgScore(classResults),
        passRate: passRate(classResults),
      }
    })
    .filter((row): row is ReportClassStat => row !== null)
    .sort((a, b) => a.className.localeCompare(b.className))
}

function computeBySubject(results: TestResult[]): ReportSubjectStat[] {
  const groups = new Map<string, TestResult[]>()
  for (const r of results) {
    if (!r.subject) continue
    if (!groups.has(r.subject)) groups.set(r.subject, [])
    groups.get(r.subject)!.push(r)
  }
  return Array.from(groups.entries())
    .map(([subject, subResults]) => ({
      subject,
      studentsTook: new Set(subResults.map((r) => r.studentId)).size,
      avgScore: avgScore(subResults),
      passRate: passRate(subResults),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject))
}

function computeByClassSubject(
  results: TestResult[],
  classes: Class[]
): ReportClassSubjectCell[] {
  const out: ReportClassSubjectCell[] = []
  for (const cls of classes) {
    const classResults = results.filter((r) => r.classId === cls.id)
    if (classResults.length === 0) continue
    const subjects = new Map<string, TestResult[]>()
    for (const r of classResults) {
      if (!r.subject) continue
      if (!subjects.has(r.subject)) subjects.set(r.subject, [])
      subjects.get(r.subject)!.push(r)
    }
    for (const [subject, subRes] of subjects) {
      out.push({
        className: cls.name,
        subject,
        avgScore: avgScore(subRes),
        studentsTook: new Set(subRes.map((r) => r.studentId)).size,
      })
    }
  }
  return out
}

function computeByStudent(
  results: TestResult[],
  students: StudentUser[],
  classes: Class[]
): ReportStudentStat[] {
  const classNameById = new Map(classes.map((c) => [c.id, c.name]))
  const studentById = new Map(students.map((s) => [s.uid, s]))

  // Group results by student
  const byStudent = new Map<string, TestResult[]>()
  for (const r of results) {
    if (!r.studentId) continue
    if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, [])
    byStudent.get(r.studentId)!.push(r)
  }

  const rows: ReportStudentStat[] = []
  for (const [studentId, studentResults] of byStudent) {
    const student = studentById.get(studentId)
    if (!student) continue

    // For each subject — take the latest attempt's score
    const bySubject = new Map<string, TestResult>()
    for (const r of studentResults) {
      if (!r.subject) continue
      const existing = bySubject.get(r.subject)
      if (!existing) {
        bySubject.set(r.subject, r)
        continue
      }
      const rTime = toMs(r.submittedAt ?? r.startedAt)
      const eTime = toMs(existing.submittedAt ?? existing.startedAt)
      if (rTime > eTime) bySubject.set(r.subject, r)
    }

    const subjectsArr = Array.from(bySubject.entries())
      .map(([subject, r]) => ({ subject, score: r.score }))
      .sort((a, b) => a.subject.localeCompare(b.subject))

    if (subjectsArr.length === 0) continue

    const avg = round(
      subjectsArr.reduce((a, s) => a + s.score, 0) / subjectsArr.length
    )

    rows.push({
      name: student.name,
      className: studentResults[0].classId
        ? classNameById.get(studentResults[0].classId) ?? '—'
        : '—',
      avgScore: avg,
      attempts: subjectsArr.length,
      subjects: subjectsArr,
    })
  }

  // Сортируем по возрастанию средн.балла — слабые сверху, чтобы Claude их заметил первыми
  return rows.sort((a, b) => a.avgScore - b.avgScore)
}

function toMs(value: TestResult['startedAt'] | undefined): number {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && 'toMillis' in value) return value.toMillis()
  return 0
}

function computeOverall(
  results: TestResult[],
  students: StudentUser[]
): ReportPayload['overall'] {
  const studentsTook = new Set(results.map((r) => r.studentId)).size
  return {
    studentsTotal: students.length,
    studentsTook,
    avgScore: avgScore(results),
    passRate: passRate(results),
    gradeDistribution: gradeDistribution(results),
  }
}

interface ComputeParallelInput {
  bankTitle: string
  period: string
  classLevel: ClassLevel
  results: TestResult[]
  classes: Class[]
  students: StudentUser[]
}

export function computeParallelReport(input: ComputeParallelInput): ReportPayload {
  const classesInLevel = input.classes.filter((c) => c.classLevel === input.classLevel)
  const studentsInLevel = input.students.filter(
    (s) => s.classId && classesInLevel.some((c) => c.id === s.classId)
  )
  return {
    scope: 'parallel',
    bankTitle: input.bankTitle,
    classLevel: input.classLevel,
    period: input.period,
    overall: computeOverall(input.results, studentsInLevel),
    byClass: computeByClass(input.results, classesInLevel, studentsInLevel),
    bySubject: computeBySubject(input.results),
    byClassSubject: computeByClassSubject(input.results, classesInLevel),
    byStudent: computeByStudent(input.results, studentsInLevel, classesInLevel),
  }
}

interface ComputeBankInput {
  bankTitle: string
  period: string
  results: TestResult[]
  classes: Class[]
  students: StudentUser[]
}

export interface BankReportPayload extends ReportPayload {
  byParallel: Array<{
    classLevel: ClassLevel
    studentsTook: number
    avgScore: number
    passRate: number
  }>
}

export function computeBankReport(input: ComputeBankInput): BankReportPayload {
  const levels: ClassLevel[] = [7, 8, 9, 10, 11]
  const byParallel = levels
    .map((level) => {
      const levelResults = input.results.filter((r) => r.classLevel === level)
      if (levelResults.length === 0) return null
      return {
        classLevel: level,
        studentsTook: new Set(levelResults.map((r) => r.studentId)).size,
        avgScore: avgScore(levelResults),
        passRate: passRate(levelResults),
      }
    })
    .filter((row): row is BankReportPayload['byParallel'][number] => row !== null)

  return {
    scope: 'bank',
    bankTitle: input.bankTitle,
    period: input.period,
    overall: computeOverall(input.results, input.students),
    byClass: computeByClass(input.results, input.classes, input.students),
    bySubject: computeBySubject(input.results),
    byClassSubject: computeByClassSubject(input.results, input.classes),
    byStudent: computeByStudent(input.results, input.students, input.classes),
    byParallel,
  }
}

/** Sorted list of unique class names from the byClassSubject matrix. */
export function uniqueClassesFromMatrix(matrix: ReportClassSubjectCell[]): string[] {
  return Array.from(new Set(matrix.map((c) => c.className))).sort((a, b) =>
    a.localeCompare(b)
  )
}

/** Sorted list of unique subject names from the byClassSubject matrix. */
export function uniqueSubjectsFromMatrix(matrix: ReportClassSubjectCell[]): string[] {
  return Array.from(new Set(matrix.map((c) => c.subject))).sort((a, b) =>
    a.localeCompare(b)
  )
}

/** Lookup avgScore for a (className, subject) pair; returns null if no data. */
export function getMatrixCell(
  matrix: ReportClassSubjectCell[],
  className: string,
  subject: string
): ReportClassSubjectCell | null {
  return (
    matrix.find((c) => c.className === className && c.subject === subject) ?? null
  )
}
