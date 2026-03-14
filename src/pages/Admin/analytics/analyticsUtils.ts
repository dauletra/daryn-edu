import type { TestResult, Class, AppUser, ClassLevel } from '@/types'
import { getGrade } from '@/utils/scoreUtils'

export interface ClassRow {
  classId: string
  className: string
  classLevel: ClassLevel | undefined
  enrolledStudents: number
  uniqueStudents: number
  avgScore: number
  avgGrade: number
}

export interface SubjectRow {
  subjectId: string
  subjectName: string
  uniqueStudents: number
  avgScore: number
  avgGrade: number
}

export interface OverallStats {
  uniqueStudents: number
  enrolledStudents: number
  avgScore: number
}


function avgScoreOf(results: TestResult[]) {
  if (results.length === 0) return 0
  return Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)
}

function avgGradeOf(results: TestResult[]) {
  if (results.length === 0) return 0
  return Number((results.reduce((a, r) => a + getGrade(r.score), 0) / results.length).toFixed(1))
}

export function computeOverallStats(
  results: TestResult[],
  students: AppUser[]
): OverallStats | null {
  if (results.length === 0) return null
  const uniqueStudents = new Set(results.map((r) => r.studentId)).size
  return {
    uniqueStudents,
    enrolledStudents: students.length,
    avgScore: avgScoreOf(results),
  }
}

export function groupByClass(
  results: TestResult[],
  classes: Class[],
  students: AppUser[]
): ClassRow[] {
  return classes
    .map((cls) => {
      const classResults = results.filter((r) => r.classId === cls.id)
      if (classResults.length === 0) return null
      const enrolledStudents = students.filter((s) => s.classId === cls.id).length
      const uniqueStudents = new Set(classResults.map((r) => r.studentId)).size

      return {
        classId: cls.id,
        className: cls.name,
        classLevel: cls.classLevel,
        enrolledStudents,
        uniqueStudents,
        avgScore: avgScoreOf(classResults),
        avgGrade: avgGradeOf(classResults),
      }
    })
    .filter((row): row is ClassRow => row !== null)
    .sort((a, b) => a.className.localeCompare(b.className))
}

export function groupBySubject(results: TestResult[], students: AppUser[]): SubjectRow[] {
  const bySubject = new Map<string, TestResult[]>()

  for (const r of results) {
    if (!r.subjectId) continue
    if (!bySubject.has(r.subjectId)) bySubject.set(r.subjectId, [])
    bySubject.get(r.subjectId)!.push(r)
  }

  return Array.from(bySubject.entries())
    .map(([subjectId, subResults]) => ({
      subjectId,
      subjectName: subResults[0].subject,
      uniqueStudents: new Set(subResults.map((r) => r.studentId)).size,
      avgScore: avgScoreOf(subResults),
      avgGrade: avgGradeOf(subResults),
    }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
}
