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
import {
  type CompareReportPayload,
  getBankParallel,
  getBankSubject,
} from './compareComputations'

interface ExportInput {
  payload: CompareReportPayload
  title: string
  reportText: string
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '999999' }
const CELL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }

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

function buildParallelsTable(payload: CompareReportPayload): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Тест банкі'),
      ...payload.parallels.map((p) => headerCell(`${p} сынып`)),
      headerCell('Жалпы'),
    ],
  })

  const rows = payload.banks.map(
    (bank) =>
      new TableRow({
        children: [
          dataCell(
            `${bank.name} (${bank.quarter}-тоқсан, ${bank.academicYear}–${bank.academicYear + 1})`,
            { bold: true, align: AlignmentType.LEFT }
          ),
          ...payload.parallels.map((p) => {
            const c = getBankParallel(bank, p)
            return dataCell(c ? `${c.avgScore}%` : '—')
          }),
          dataCell(`${bank.overall.avgScore}%`, { bold: true }),
        ],
      })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows],
  })
}

function buildSubjectsTable(payload: CompareReportPayload): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [headerCell('Тест банкі'), ...payload.subjects.map((s) => headerCell(s))],
  })

  const rows = payload.banks.map(
    (bank) =>
      new TableRow({
        children: [
          dataCell(
            `${bank.name} (${bank.quarter}-тоқсан, ${bank.academicYear}–${bank.academicYear + 1})`,
            { bold: true, align: AlignmentType.LEFT }
          ),
          ...payload.subjects.map((s) => {
            const c = getBankSubject(bank, s)
            return dataCell(c ? `${c.avgScore}%` : '—')
          }),
        ],
      })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows],
  })
}

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

export async function exportCompareReportToWord(input: ExportInput): Promise<void> {
  const { payload, title, reportText } = input

  const banksList = payload.banks
    .map(
      (b) => `${b.name} (${b.quarter}-тоқсан, ${b.academicYear}–${b.academicYear + 1})`
    )
    .join('; ')

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'САЛЫСТЫРМАЛЫ АНЫҚТАМА', bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Тест банктары: ${banksList}`, size: 20, italics: true }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: 'Параллельдер бойынша орташа балл',
          bold: true,
          size: 26,
        }),
      ],
    }),
    buildParallelsTable(payload),
    new Paragraph({ children: [new TextRun({ text: '' })] }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({ text: 'Пәндер бойынша орташа балл', bold: true, size: 26 }),
      ],
    }),
    buildSubjectsTable(payload),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
  ]

  if (reportText) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: 'Талдау және қорытынды', bold: true, size: 26 }),
        ],
      }),
      ...parseReportText(reportText)
    )
  }

  const doc = new Document({
    creator: 'EduCore',
    title,
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 24 } } },
    },
    sections: [{ children }],
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
