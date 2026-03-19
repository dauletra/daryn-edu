// Used internally when saving a test to Firestore
export function generateTestTitle(data: {
  subject: string
  classLevel: number
  variantNumber: number
}): string {
  return `${data.subject} - ${data.classLevel} сын. - Нұсқа ${data.variantNumber}`
}

export function formatTestTitle(test: {
  subject: string
  language: string
  classLevel: number
  variantNumber: number
}): string {
  const langLabel =
    test.language === 'ru' ? ' (рус)' :
    test.language === 'en' ? ' (eng)' :
    ''
  return `${test.subject}${langLabel} · ${test.classLevel} сын · нұс ${test.variantNumber}`
}
