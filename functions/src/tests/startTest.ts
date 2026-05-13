import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import {
  fisherYates,
  shuffleOptions,
  gradeAnswers,
  type ShuffledQuestion,
} from "./grading";

const CHUNK = 30;

export const startTest = onCall(
  { timeoutSeconds: 30 },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Необходима авторизация");
    }

    const uid = request.auth.uid;
    const { testId } = request.data as { testId: string };

    if (!testId || typeof testId !== "string") {
      throw new HttpsError("invalid-argument", "testId обязателен");
    }

    // 2. Role check — only students
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== "student") {
      throw new HttpsError("permission-denied", "Только студенты могут проходить тесты");
    }

    // 3. Get test
    const testDoc = await db.collection("tests").doc(testId).get();
    if (!testDoc.exists) {
      throw new HttpsError("not-found", "Тест не найден");
    }
    const testData = testDoc.data()!;

    // 4. Verify test is assigned to student's class
    const classId = userData.classId;
    if (classId) {
      const classDoc = await db.collection("classes").doc(classId).get();
      const classData = classDoc.data();
      if (!classData?.assignedTests?.includes(testId)) {
        throw new HttpsError("permission-denied", "Тест не назначен вашему классу");
      }
    }

    const resultId = `${uid}_${testId}`;
    const resultDoc = await db.collection("results").doc(resultId).get();

    // ── 5a. Already completed ─────────────────────────────────────────
    if (resultDoc.exists && resultDoc.data()?.status === "completed") {
      return { phase: "already_completed" as const };
    }

    // ── 5b. In progress — resume or expire ────────────────────────────
    if (resultDoc.exists && resultDoc.data()?.status === "in_progress") {
      const resultData = resultDoc.data()!;
      const startedAt = resultData.startedAt?.toMillis?.() ?? Date.now();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const timeLimitSeconds = testData.timeLimit * 60;
      const remaining = timeLimitSeconds - elapsed;

      const questionIds: string[] = resultData.questionIds || [];
      const optionsMap: Record<string, number[]> | undefined = resultData.optionsMap;

      // Time expired — grade server-side using auto-saved answers
      if (remaining <= 0) {
        const savedAnswers = (resultData.answers || []).map(
          (a: { questionId: string; selectedIndex: number }) => ({
            questionId: a.questionId,
            selectedIndex: a.selectedIndex,
          })
        );

        const { correctCount, score, total, wrongQuestionIds, gradedAnswers } =
          await gradeAnswers(resultData.testId, questionIds, savedAnswers, optionsMap);

        await db.collection("results").doc(resultId).update({
          answers: gradedAnswers,
          status: "completed",
          submittedAt: FieldValue.serverTimestamp(),
          correctCount,
          score,
          wrongQuestionIds,
        });

        return { phase: "finished" as const, score, correctCount, total };
      }

      // Still time left — return stored shuffledQuestions directly
      const shuffledQuestions: ShuffledQuestion[] = resultData.shuffledQuestions ?? [];

      // Backward compat: old result docs don't have shuffledQuestions
      // Fall back to re-fetch + re-apply optionsMap so old sessions still work
      if (shuffledQuestions.length === 0 && questionIds.length > 0) {
        const questions: ShuffledQuestion[] = [];
        for (let i = 0; i < questionIds.length; i += CHUNK) {
          const chunk = questionIds.slice(i, i + CHUNK);
          const snap = await db
            .collection("tests")
            .doc(testId)
            .collection("questions")
            .where("__name__", "in", chunk)
            .get();
          for (const d of snap.docs) {
            const qData = d.data();
            questions.push({ id: d.id, text: qData.text, options: qData.options });
          }
        }

        const restored = questionIds
          .map((qId) => {
            const q = questions.find((qq) => qq.id === qId);
            if (!q) return null;
            const qMap = optionsMap?.[qId];
            if (qMap) {
              return { ...q, options: qMap.map((origIdx) => q.options[origIdx]) };
            }
            return q;
          })
          .filter((q): q is ShuffledQuestion => !!q);

        const savedAnswers = (resultData.answers || []).map(
          (a: { questionId: string; selectedIndex: number }) => ({
            questionId: a.questionId,
            selectedIndex: a.selectedIndex,
          })
        );

        return {
          phase: "testing" as const,
          resultId,
          questions: restored,
          answers: savedAnswers,
          remainingSeconds: remaining,
        };
      }

      // NEW path: return stored shuffledQuestions directly — no re-mapping needed
      const savedAnswers = (resultData.answers || []).map(
        (a: { questionId: string; selectedIndex: number }) => ({
          questionId: a.questionId,
          selectedIndex: a.selectedIndex,
        })
      );

      return {
        phase: "testing" as const,
        resultId,
        questions: shuffledQuestions,
        answers: savedAnswers,
        remainingSeconds: remaining,
      };
    }

    // ── 5c. No result — start new test ────────────────────────────────

    const allQuestionsSnap = await db
      .collection("tests")
      .doc(testId)
      .collection("questions")
      .get();

    const allQuestions = allQuestionsSnap.docs.map((d) => ({
      id: d.id,
      text: d.data().text as string,
      options: d.data().options as string[],
    }));

    const selected = fisherYates(allQuestions).slice(0, testData.questionCount);
    const questionIds = selected.map((q) => q.id);

    const optionsMap: Record<string, number[]> = {};
    const shuffledQuestions: ShuffledQuestion[] = selected.map((q) => {
      const { shuffled, map } = shuffleOptions(q.options);
      optionsMap[q.id] = map;
      return { id: q.id, text: q.text, options: shuffled };
    });

    let quarter = `${new Date().getFullYear()}-Q1`;
    let year = new Date().getFullYear();
    if (testData.testBankId) {
      const bankDoc = await db.collection("testBanks").doc(testData.testBankId).get();
      if (bankDoc.exists) {
        const bankData = bankDoc.data()!;
        quarter = `${bankData.academicYear}-Q${bankData.quarter}`;
        year = bankData.academicYear;
      }
    }

    await db.collection("results").doc(resultId).set({
      testId,
      studentId: uid,
      classId: classId || "",
      quarter,
      year,
      classLevel: testData.classLevel,
      subjectId: testData.subjectId,
      subject: testData.subject,
      testBankId: testData.testBankId,
      questionIds,
      shuffledQuestions,
      optionsMap,
      startedAt: FieldValue.serverTimestamp(),
      status: "in_progress",
      answers: [],
      wrongQuestionIds: [],
      correctCount: 0,
      score: 0,
    });

    return {
      phase: "testing" as const,
      resultId,
      questions: shuffledQuestions,
      remainingSeconds: testData.timeLimit * 60,
    };
  }
);
