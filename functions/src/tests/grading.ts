import { FieldPath } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";

/** Question shape returned to students — no correctIndex. */
export interface ShuffledQuestion {
  id: string;
  text: string;
  options: string[];
}

/** Unbiased Fisher-Yates shuffle — works for any array type. */
export function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Fisher-Yates shuffle for answer options.
 * Returns shuffled options and a map: map[shuffledIndex] = originalIndex
 */
export function shuffleOptions(options: string[]): { shuffled: string[]; map: number[] } {
  const indices = options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    shuffled: indices.map((i) => options[i]),
    map: indices,
  };
}

/**
 * Server-side grading helper.
 * Uses optionsMap to convert shuffled selectedIndex back to original before comparing.
 */
export async function gradeAnswers(
  testId: string,
  questionIds: string[],
  answers: { questionId: string; selectedIndex: number }[],
  optionsMap?: Record<string, number[]>
): Promise<{
  correctCount: number;
  score: number;
  total: number;
  wrongQuestionIds: string[];
  gradedAnswers: { questionId: string; selectedIndex: number; correct: boolean }[];
}> {
  const correctMap = new Map<string, number>();
  const CHUNK_SIZE = 30;
  for (let i = 0; i < questionIds.length; i += CHUNK_SIZE) {
    const chunk = questionIds.slice(i, i + CHUNK_SIZE);
    const snap = await db
      .collection("tests")
      .doc(testId)
      .collection("questions")
      .where(FieldPath.documentId(), "in", chunk)
      .get();
    for (const d of snap.docs) {
      correctMap.set(d.id, d.data().correctIndex);
    }
  }

  const total = questionIds.length;
  const gradedAnswers = questionIds.map((qId) => {
    const answer = answers.find((a) => a.questionId === qId);
    const selectedIndex = answer?.selectedIndex ?? -1;
    const correctIndex = correctMap.get(qId);
    const qMap = optionsMap?.[qId];

    let originalSelectedIndex = selectedIndex;
    if (qMap && selectedIndex >= 0 && selectedIndex < qMap.length) {
      originalSelectedIndex = qMap[selectedIndex];
    }

    return {
      questionId: qId,
      selectedIndex,
      correct: correctIndex !== undefined && originalSelectedIndex === correctIndex,
    };
  });

  const correctCount = gradedAnswers.filter((a) => a.correct).length;
  const score = Math.round((correctCount / total) * 100);
  const wrongQuestionIds = gradedAnswers
    .filter((a) => !a.correct)
    .map((a) => a.questionId);

  return { correctCount, score, total, wrongQuestionIds, gradedAnswers };
}
