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
>(functions, 'generateQuestions')

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
