import type { TestResult, Class, AppUser, ClassLevel } from '@/types'

export interface AggregatedStats {
  totalResults: number
  avgScore: number
  maxScore: number
  minScore: number
}

export interface GradeLevelRow extends AggregatedStats {
  classLevel: ClassLevel
  classCount: number
  studentCount: number
}

export interface ClassRow extends AggregatedStats {
  classId: string
  className: string
  classLevel: ClassLevel | undefined
  studentCount: number
}

export interface SubjectRow extends AggregatedStats {
  subjectId: string
  subjectName: string
}

export function computeStats(results: TestResult[]): AggregatedStats | null {
  if (results.length === 0) return null
  const scores = results.map((r) => r.score)
  return {
    totalResults: results.length,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    maxScore: Math.max(...scores),
    minScore: Math.min(...scores),
  }
}

export function groupByClassLevel(
  results: TestResult[],
  classes: Class[],
  students: AppUser[]
): GradeLevelRow[] {
  const levels: ClassLevel[] = [7, 8, 9, 10, 11]

  return levels
    .map((level) => {
      const levelResults = results.filter((r) => r.classLevel === level)
      const levelClasses = classes.filter((c) => c.classLevel === level)
      const levelClassIds = new Set(levelClasses.map((c) => c.id))
      const levelStudentCount = students.filter((s) => s.classId && levelClassIds.has(s.classId)).length
      const stats = computeStats(levelResults)

      return {
        classLevel: level,
        classCount: levelClasses.length,
        studentCount: levelStudentCount,
        totalResults: stats?.totalResults ?? 0,
        avgScore: stats?.avgScore ?? 0,
        maxScore: stats?.maxScore ?? 0,
        minScore: stats?.minScore ?? 0,
      }
    })
    .filter((row) => row.totalResults > 0)
}

export function groupByClass(
  results: TestResult[],
  classes: Class[],
  students: AppUser[]
): ClassRow[] {
  return classes
    .map((cls) => {
      const classResults = results.filter((r) => r.classId === cls.id)
      const classStudentCount = students.filter((s) => s.classId === cls.id).length
      const stats = computeStats(classResults)

      return {
        classId: cls.id,
        className: cls.name,
        classLevel: cls.classLevel,
        studentCount: classStudentCount,
        totalResults: stats?.totalResults ?? 0,
        avgScore: stats?.avgScore ?? 0,
        maxScore: stats?.maxScore ?? 0,
        minScore: stats?.minScore ?? 0,
      }
    })
    .filter((row) => row.totalResults > 0)
    .sort((a, b) => a.className.localeCompare(b.className))
}

export function groupBySubject(results: TestResult[]): SubjectRow[] {
  const bySubject = new Map<string, TestResult[]>()

  for (const r of results) {
    if (!r.subjectId) continue
    if (!bySubject.has(r.subjectId)) bySubject.set(r.subjectId, [])
    bySubject.get(r.subjectId)!.push(r)
  }

  return Array.from(bySubject.entries())
    .map(([subjectId, subResults]) => {
      const stats = computeStats(subResults)!
      return {
        subjectId,
        subjectName: subResults[0].subject,
        ...stats,
      }
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
}
