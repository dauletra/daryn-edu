import ExcelJS from 'exceljs'
import type { TestResult, AppUser, TestBank } from '@/types'

export interface SubjectMeta { subjectId: string; subjectName: string }

function getGrade(score: number) {
  return score >= 85 ? 5 : score >= 65 ? 4 : score >= 41 ? 3 : 2
}

// ─── Shared style helpers ────────────────────────────────────────────────────

const BORDER_THIN: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } }
const BORDER_MEDIUM: ExcelJS.Border = { style: 'medium', color: { argb: 'FF000000' } }
const ALL_THIN = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN }
const ALL_MEDIUM = { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_MEDIUM, right: BORDER_MEDIUM }

function styleInfoRow(row: ExcelJS.Row) {
  row.font = { bold: true, size: 11 }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
  row.alignment = { horizontal: 'left', vertical: 'middle' }
  row.height = 18
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, size: 10, color: { argb: 'FF000000' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } }
  row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  row.height = 30
  row.eachCell((cell) => { cell.border = ALL_THIN })
}

function styleDataRow(row: ExcelJS.Row, nameCol: number) {
  row.height = 16
  row.eachCell((cell, col) => {
    cell.border = ALL_THIN
    cell.alignment = {
      horizontal: col === nameCol ? 'left' : 'center',
      vertical: 'middle',
    }
    cell.font = { size: 10 }
  })
}

function styleAvgRow(row: ExcelJS.Row) {
  row.font = { bold: true, size: 10 }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } }
  row.height = 16
  row.eachCell((cell) => {
    cell.border = ALL_MEDIUM
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  // Label left-aligned
  row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }
}

// ─── Main export function ────────────────────────────────────────────────────

export async function exportClassResults(params: {
  bank: TestBank
  className: string
  classStudents: AppUser[]
  bankResults: TestResult[]
  classId: string
  activeSubjects: SubjectMeta[]
}) {
  const { bank, className, classStudents, bankResults, classId, activeSubjects } = params
  const wb = new ExcelJS.Workbook()
  wb.creator = 'EduCore'

  const bankInfo = `${bank.name} | ${bank.academicYear}–${bank.academicYear + 1} | ${bank.quarter} четверть`

  // ── Build data structures ──────────────────────────────────────────────────
  const classResults = bankResults.filter((r) => r.classId === classId)

  const resultMap = new Map<string, Map<string, TestResult>>()
  for (const r of classResults) {
    if (!resultMap.has(r.studentId)) resultMap.set(r.studentId, new Map())
    resultMap.get(r.studentId)!.set(r.subjectId, r)
  }

  const subjectTotals = new Map<string, number>()
  for (const r of classResults) {
    subjectTotals.set(r.subjectId, Math.max(subjectTotals.get(r.subjectId) ?? 0, r.questionIds.length))
  }

  const studentRows = classStudents.map((student) => {
    const bySubject = resultMap.get(student.uid) ?? new Map<string, TestResult>()
    let totalCorrect = 0
    let totalQuestions = 0
    for (const r of bySubject.values()) {
      totalCorrect += r.correctCount
      totalQuestions += r.questionIds.length
    }
    const totalPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null
    return { student, bySubject, totalCorrect, totalQuestions, totalPct }
  }).sort((a, b) => (b.totalPct ?? -1) - (a.totalPct ?? -1))

  // ── Sheet 1: Итого ─────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Итого')
    const totalCols = 2 + activeSubjects.length + 2

    ws.columns = [
      { width: 4 },
      { width: 26 },
      ...activeSubjects.map(() => ({ width: 14 })),
      { width: 12 },
      { width: 8 },
    ]

    // Row 1: bank info
    const r1 = ws.addRow([bankInfo])
    ws.mergeCells(1, 1, 1, totalCols)
    styleInfoRow(r1)

    // Row 2: class info
    const r2 = ws.addRow([`Класс: ${className}`])
    ws.mergeCells(2, 1, 2, totalCols)
    styleInfoRow(r2)

    // Row 3: empty
    ws.addRow([])

    // Row 4: headers
    const headers = [
      '#',
      'Ученик',
      ...activeSubjects.map((s) => `${s.subjectName} [${subjectTotals.get(s.subjectId) ?? '?'}]`),
      'Итого',
      '%',
    ]
    const headerRow = ws.addRow(headers)
    styleHeaderRow(headerRow)
    headerRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }

    // Data rows
    studentRows.forEach(({ student, bySubject, totalCorrect, totalQuestions, totalPct }, i) => {
      const rowData = [
        i + 1,
        student.name,
        ...activeSubjects.map((s) => {
          const r = bySubject.get(s.subjectId)
          return r ? r.correctCount : '—'
        }),
        totalQuestions > 0 ? `${totalCorrect}/${totalQuestions}` : '—',
        totalPct !== null ? `${totalPct}%` : '—',
      ]
      const row = ws.addRow(rowData)
      styleDataRow(row, 2)
    })

    // Average row
    const withResults = studentRows.filter((r) => r.totalQuestions > 0)
    const avgPct = withResults.length > 0
      ? Math.round(withResults.reduce((a, r) => a + (r.totalPct ?? 0), 0) / withResults.length)
      : null
    const sumCorrect = withResults.reduce((a, r) => a + r.totalCorrect, 0)
    const sumTotal = withResults.reduce((a, r) => a + r.totalQuestions, 0)

    const avgRowData = [
      '',
      'Среднее',
      ...activeSubjects.map((s) => {
        const scores = studentRows
          .map((r) => r.bySubject.get(s.subjectId)?.correctCount)
          .filter((v): v is number => v !== undefined)
        return scores.length > 0
          ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
          : '—'
      }),
      withResults.length > 0
        ? `${(sumCorrect / withResults.length).toFixed(1)}/${(sumTotal / withResults.length).toFixed(1)}`
        : '—',
      avgPct !== null ? `${avgPct}%` : '—',
    ]
    const avgRow = ws.addRow(avgRowData)
    styleAvgRow(avgRow)
  }

  // ── Sheets per subject ─────────────────────────────────────────────────────
  for (const subject of activeSubjects) {
    const sheetName = subject.subjectName.slice(0, 31)
    const ws = wb.addWorksheet(sheetName)

    ws.columns = [
      { width: 4 },
      { width: 26 },
      { width: 8 },
      { width: 12 },
      { width: 8 },
      { width: 8 },
    ]

    const subjectResultMap = new Map<string, TestResult>()
    for (const r of classResults) {
      if (r.subjectId === subject.subjectId) subjectResultMap.set(r.studentId, r)
    }

    const subjectTotal = Math.max(0, ...Array.from(subjectResultMap.values()).map((r) => r.questionIds.length))

    const rows = [...studentRows]
      .map(({ student }) => ({ student, result: subjectResultMap.get(student.uid) ?? null }))
      .sort((a, b) => (b.result?.score ?? -1) - (a.result?.score ?? -1))

    // Row 1: bank info
    const r1 = ws.addRow([bankInfo])
    ws.mergeCells(1, 1, 1, 6)
    styleInfoRow(r1)

    // Row 2: class + subject
    const r2 = ws.addRow([`Класс: ${className} | Предмет: ${subject.subjectName}`])
    ws.mergeCells(2, 1, 2, 6)
    styleInfoRow(r2)

    // Row 3: empty
    ws.addRow([])

    // Row 4: headers
    const ballLabel = subjectTotal > 0 ? `Балл [${subjectTotal}]` : 'Балл'
    const headerRow = ws.addRow(['#', 'Ученик', 'Класс', ballLabel, '%', 'Оценка'])
    styleHeaderRow(headerRow)
    headerRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }

    // Data rows
    rows.forEach(({ student, result }, i) => {
      const rowData = [
        i + 1,
        student.name,
        className,
        result ? result.correctCount : '—',
        result ? `${result.score}%` : '—',
        result ? getGrade(result.score) : '—',
      ]
      const row = ws.addRow(rowData)
      styleDataRow(row, 2)
    })

    // Average row
    const withResults = rows.filter((r) => r.result !== null)
    if (withResults.length > 0) {
      const avgScore = Math.round(withResults.reduce((a, r) => a + r.result!.score, 0) / withResults.length)
      const avgGrade = Number((withResults.reduce((a, r) => a + getGrade(r.result!.score), 0) / withResults.length).toFixed(1))
      const totalCorrect = withResults.reduce((a, r) => a + r.result!.correctCount, 0)
      const avgRow = ws.addRow([
        '',
        'Среднее',
        '—',
        Number((totalCorrect / withResults.length).toFixed(1)),
        `${avgScore}%`,
        avgGrade,
      ])
      styleAvgRow(avgRow)
    }
  }

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${className}_${bank.name}.xlsx`.replace(/[\\/:*?"<>|]/g, '_')
  a.click()
  URL.revokeObjectURL(url)
}
