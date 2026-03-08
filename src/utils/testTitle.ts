export function generateTestTitle(data: {
  subject: string
  classLevel: number
  variantNumber: number
}): string {
  return `${data.subject} - ${data.classLevel} кл. - Вариант ${data.variantNumber}`
}
