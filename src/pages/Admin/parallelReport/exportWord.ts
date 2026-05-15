import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx'
import type { ReportPayload } from '@/services/claude'
import {
  uniqueClassesFromMatrix,
  uniqueSubjectsFromMatrix,
  getMatrixCell,
} from './reportComputations'

interface ExportInput {
  payload: ReportPayload
  title: string
  reportText: string
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '999999' }
const CELL_BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
}

function headerCell(text: string): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    shading: { fill: 'EFEFEF' },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 20 })],
      }),
    ],
  })
}

function dataCell(
  text: string,
  opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}
): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.CENTER,
        children: [new TextRun({ text, bold: opts.bold, size: 20 })],
      }),
    ],
  })
}

function buildMatrixTable(payload: ReportPayload): Table {
  const classNames = uniqueClassesFromMatrix(payload.byClassSubject)
  const subjects = uniqueSubjectsFromMatrix(payload.byClassSubject)

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Сынып'),
      ...subjects.map((s) => headerCell(s)),
      headerCell('Орташа'),
    ],
  })

  const dataRows = classNames.map((cn) => {
    const classRow = payload.byClass.find((c) => c.className === cn)
    return new TableRow({
      children: [
        dataCell(cn, { bold: true, align: AlignmentType.LEFT }),
        ...subjects.map((s) => {
          const cell = getMatrixCell(payload.byClassSubject, cn, s)
          return dataCell(cell ? `${cell.avgScore}%` : '—')
        }),
        dataCell(classRow ? `${classRow.avgScore}%` : '—', { bold: true }),
      ],
    })
  })

  const subjectAvgRow = new TableRow({
    children: [
      dataCell('Пән бойынша', { bold: true, align: AlignmentType.LEFT }),
      ...subjects.map((s) => {
        const r = payload.bySubject.find((x) => x.subject === s)
        return dataCell(r ? `${r.avgScore}%` : '—', { bold: true })
      }),
      dataCell(`${payload.overall.avgScore}%`, { bold: true }),
    ],
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, subjectAvgRow],
  })
}

function buildOverallTable(payload: ReportPayload): Table {
  const { overall } = payload
  const rows = [
    ['Барлық оқушы', String(overall.studentsTotal)],
    ['Тапсырған оқушы', String(overall.studentsTook)],
    [
      'Қамту',
      overall.studentsTotal > 0
        ? `${Math.round((overall.studentsTook / overall.studentsTotal) * 100)}%`
        : '—',
    ],
    ['Орташа балл', `${overall.avgScore}%`],
    ['Өту көрсеткіші (≥40%)', `${overall.passRate}%`],
    [
      'Бағалар бөлінісі',
      `5: ${overall.gradeDistribution.grade5}, 4: ${overall.gradeDistribution.grade4}, 3: ${overall.gradeDistribution.grade3}, 2: ${overall.gradeDistribution.grade2}`,
    ],
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            dataCell(label, { bold: true, align: AlignmentType.LEFT }),
            dataCell(value, { align: AlignmentType.LEFT }),
          ],
        })
    ),
  })
}

/** Parse Claude markdown-like output into Paragraph[] preserving section headings. */
function parseReportText(text: string): Paragraph[] {
  const lines = text.split(/\r?\n/)
  const result: Paragraph[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      result.push(new Paragraph({ children: [new TextRun({ text: '' })] }))
      continue
    }

    const headingMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (headingMatch) {
      result.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({ text: line.replace(/\*\*/g, ''), bold: true, size: 26 }),
          ],
        })
      )
      continue
    }

    result.push(
      new Paragraph({
        children: [new TextRun({ text: line.replace(/\*\*/g, ''), size: 22 })],
      })
    )
  }

  return result
}

export async function exportReportToWord(input: ExportInput): Promise<void> {
  const { payload, title, reportText } = input

  const doc = new Document({
    creator: 'EduCore',
    title,
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 24 },
        },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'АНЫҚТАМА', bold: true, size: 32 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: title, size: 24 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Тест банкі: ${payload.bankTitle} | Кезең: ${payload.period}`,
                size: 20,
                italics: true,
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Жалпы көрсеткіштер', bold: true, size: 26 })],
          }),
          buildOverallTable(payload),
          new Paragraph({ children: [new TextRun({ text: '' })] }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: 'Сыныптар мен пәндер бойынша кесте', bold: true, size: 26 }),
            ],
          }),
          buildMatrixTable(payload),
          new Paragraph({ children: [new TextRun({ text: '' })] }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Талдау және қорытынды', bold: true, size: 26 })],
          }),
          ...parseReportText(reportText),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
