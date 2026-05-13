import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { gradeAnswers } from "./grading";

export const submitTest = onCall(
  { timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Необходима авторизация");
    }

    const uid = request.auth.uid;
    const { resultId, answers } = request.data as {
      resultId: string;
      answers: { questionId: string; selectedIndex: number }[];
    };

    if (!resultId || !Array.isArray(answers)) {
      throw new HttpsError("invalid-argument", "resultId и answers обязательны");
    }

    const resultDoc = await db.collection("results").doc(resultId).get();
    if (!resultDoc.exists) {
      throw new HttpsError("not-found", "Результат не найден");
    }

    const resultData = resultDoc.data()!;

    if (resultData.studentId !== uid) {
      throw new HttpsError("permission-denied", "Результат не принадлежит вам");
    }

    if (resultData.status === "completed") {
      throw new HttpsError("failed-precondition", "Тест уже завершён");
    }

    // Use submitted answers if within grace period, else fall back to auto-saved
    const startedAt = resultData.startedAt?.toMillis?.() ?? Date.now();
    const testDoc = await db.collection("tests").doc(resultData.testId).get();
    const timeLimitSeconds = (testDoc.data()?.timeLimit ?? 40) * 60;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const GRACE_PERIOD = 30;

    const isWithinTime = elapsed <= timeLimitSeconds + GRACE_PERIOD;

    const answersToGrade = isWithinTime
      ? answers
      : (resultData.answers || []).map(
          (a: { questionId: string; selectedIndex: number }) => ({
            questionId: a.questionId,
            selectedIndex: a.selectedIndex,
          })
        );

    const questionIds: string[] = resultData.questionIds || [];
    const resultOptionsMap: Record<string, number[]> | undefined = resultData.optionsMap;

    const { correctCount, score, total, wrongQuestionIds, gradedAnswers } =
      await gradeAnswers(resultData.testId, questionIds, answersToGrade, resultOptionsMap);

    await db.collection("results").doc(resultId).update({
      answers: gradedAnswers,
      status: "completed",
      submittedAt: FieldValue.serverTimestamp(),
      correctCount,
      score,
      wrongQuestionIds,
    });

    return { score, correctCount, total };
  }
);
