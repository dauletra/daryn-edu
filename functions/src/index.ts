import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, FieldPath } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

initializeApp();

const db = getFirestore();
const claudeApiKey = defineSecret("CLAUDE_API_KEY");

// ─── Constants ───────────────────────────────────────────────────────

const ALLOWED_COUNTS = [10, 20, 30] as const;
const ALLOWED_LANGUAGES = ["kz", "ru", "en"] as const;
const DAILY_REQUEST_LIMIT = 50;

const LANG_PROMPT_LABELS: Record<string, string> = {
  kz: "казахском",
  ru: "русском",
  en: "английском",
};

const MAX_TOKENS_BY_COUNT: Record<number, number> = {
  10: 4096,
  20: 8192,
  30: 12288,
};

// ─── LaTeX fix utilities ─────────────────────────────────────────────

function fixLatexEscapes(rawJson: string): string {
  let fixed = rawJson.replace(/(?<!\\)\\([ftnrb])([a-zA-Z])/g, "\\\\$1$2");
  fixed = fixed.replace(/(?<!\\)\\(?![\\/"bfnrtu])/g, "\\\\");
  return fixed;
}

function fixControlChars(text: string): string {
  return text
    .replace(/\f([a-zA-Z])/g, "\\f$1")
    .replace(/\t([a-zA-Z])/g, "\\t$1")
    .replace(/\n([a-zA-Z])/g, "\\n$1")
    .replace(/\r([a-zA-Z])/g, "\\r$1")
    .replace(/[\x08]([a-zA-Z])/g, "\\b$1");
}

// ─── Rate limiting ───────────────────────────────────────────────────

async function checkRateLimit(uid: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const ref = db.collection("aiUsage").doc(uid);
  const doc = await ref.get();

  if (!doc.exists || doc.data()?.date !== today) {
    await ref.set({ date: today, count: 1 });
    return;
  }

  const count = doc.data()?.count ?? 0;
  if (count >= DAILY_REQUEST_LIMIT) {
    throw new HttpsError(
      "resource-exhausted",
      `Превышен лимит запросов (${DAILY_REQUEST_LIMIT}/день). Попробуйте завтра.`
    );
  }

  await ref.update({ count: FieldValue.increment(1) });
}

// ─── Cloud Function: generateQuestions ───────────────────────────────

interface GenerateRequest {
  topic: string;
  level: string;
  subject: string;
  count: number;
  language: string;
}

interface GeneratedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

export const generateQuestions = onCall(
  {
    secrets: [claudeApiKey],
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Необходима авторизация");
    }

    const uid = request.auth.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    const role = userDoc.data()?.role;
    if (role !== "moderator" && role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Только модераторы и администраторы могут генерировать вопросы"
      );
    }

    const { topic, level, subject, count, language } =
      request.data as GenerateRequest;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Укажите тему");
    }
    if (!subject || typeof subject !== "string") {
      throw new HttpsError("invalid-argument", "Укажите предмет");
    }
    if (!ALLOWED_COUNTS.includes(count as typeof ALLOWED_COUNTS[number])) {
      throw new HttpsError(
        "invalid-argument",
        `Количество вопросов должно быть: ${ALLOWED_COUNTS.join(", ")}`
      );
    }
    const lang = ALLOWED_LANGUAGES.includes(
      language as typeof ALLOWED_LANGUAGES[number]
    )
      ? language
      : "ru";
    const langLabel = LANG_PROMPT_LABELS[lang] ?? "русском";

    await checkRateLimit(uid);

    const apiKey = claudeApiKey.value();
    const levelStr = level?.trim() || "10 класс";
    const maxTokens = MAX_TOKENS_BY_COUNT[count] ?? 4096;

    const userPrompt = `${subject}, ${topic.trim()}, ${levelStr}, ${count} вопросов`;

    const systemPrompt = `Генерируй тестовые вопросы в формате JSON-массива. Только JSON, без markdown-обёртки.
Схема: [{ "text": "вопрос", "options": ["A","B","C","D","E"], "correctIndex": 0 }]

Язык: ВСЕ вопросы и варианты ответов ТОЛЬКО на ${langLabel} языке.

Качество:
- Вопросы разнообразные, не повторяющиеся по формулировке
- Сложность соответствует указанному уровню
- Неправильные варианты правдоподобные (не абсурдные)
- Каждый вопрос проверяет понимание, а не зубрёжку

Формулы (если предмет точный): инлайн в $...$, блочные в $$...$$, умножение через $\\\\cdot$, НЕ × или \\\\times.
JSON-экранирование: в строках двойной слэш — "$\\\\frac{1}{2}$", НЕ "$\\frac{1}{2}$".`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
          { role: "assistant", content: "[" },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const msg =
        errorData?.error?.message ?? `Ошибка Claude API: ${response.status}`;
      console.error("Claude API error:", msg);
      throw new HttpsError("internal", "Ошибка генерации вопросов");
    }

    const data = await response.json();
    const rawContent = data.content[0].text;

    const fullJson = "[" + rawContent;
    const jsonMatch = fullJson.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Raw AI response:", rawContent);
      throw new HttpsError(
        "internal",
        "Не удалось разобрать ответ AI, попробуйте ещё раз"
      );
    }

    const fixedJson = fixLatexEscapes(jsonMatch[0]);

    let questions: GeneratedQuestion[];
    try {
      questions = JSON.parse(fixedJson);
    } catch {
      console.error("Raw AI response:", rawContent);
      console.error("Fixed JSON attempt:", fixedJson);
      throw new HttpsError(
        "internal",
        "Не удалось разобрать ответ AI, попробуйте ещё раз"
      );
    }

    for (const q of questions) {
      if (
        !q.text ||
        !Array.isArray(q.options) ||
        q.options.length !== 5 ||
        typeof q.correctIndex !== "number" ||
        q.correctIndex < 0 ||
        q.correctIndex > 4
      ) {
        throw new HttpsError("internal", "Некорректный формат вопроса от AI");
      }
    }

    for (const q of questions) {
      q.text = fixControlChars(q.text);
      q.options = q.options.map(fixControlChars);
    }

    return { questions };
  }
);

// ─── Shuffle utilities ────────────────────────────────────────────────

/**
 * Unbiased Fisher-Yates shuffle — works for any array type.
 * Replaces the biased sort(() => Math.random() - 0.5) pattern.
 */
function fisherYates<T>(arr: T[]): T[] {
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
function shuffleOptions(options: string[]): { shuffled: string[]; map: number[] } {
  const indices = options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    shuffled: indices.map((i) => options[i]),
    map: indices, // map[shuffledPos] = originalPos
  };
}

// ─── Grading utility ──────────────────────────────────────────────────

/**
 * Server-side grading helper.
 * Uses optionsMap to convert shuffled selectedIndex back to original before comparing.
 */
async function gradeAnswers(
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

    // Map shuffled selectedIndex back to original index
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

// ─── Shared types ─────────────────────────────────────────────────────

interface ShuffledQuestion {
  id: string;
  text: string;
  options: string[]; // already shuffled, no correctIndex
}

const CHUNK = 30;

// ─── Cloud Function: startTest ────────────────────────────────────────

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
      // NEW: no re-fetching from Firestore, no re-applying optionsMap
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

    // Fetch all questions from subcollection
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

    // Unbiased Fisher-Yates shuffle for questions, then slice
    const selected = fisherYates(allQuestions).slice(0, testData.questionCount);
    const questionIds = selected.map((q) => q.id);

    // Shuffle answer options for each question
    const optionsMap: Record<string, number[]> = {};
    const shuffledQuestions: ShuffledQuestion[] = selected.map((q) => {
      const { shuffled, map } = shuffleOptions(q.options);
      optionsMap[q.id] = map;
      return { id: q.id, text: q.text, options: shuffled };
    });

    // Get quarter info from test bank
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

    // Create result — store shuffledQuestions + optionsMap
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
      shuffledQuestions, // ← stored once, returned as-is on every resume
      optionsMap,        // ← used only for grading, never reconstructing view
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

// ─── Cloud Function: submitTest ──────────────────────────────────────

export const submitTest = onCall(
  { timeoutSeconds: 30 },
  async (request) => {
    // 1. Auth check
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

    // 2. Get result
    const resultDoc = await db.collection("results").doc(resultId).get();
    if (!resultDoc.exists) {
      throw new HttpsError("not-found", "Результат не найден");
    }

    const resultData = resultDoc.data()!;

    // 3. Verify ownership
    if (resultData.studentId !== uid) {
      throw new HttpsError("permission-denied", "Результат не принадлежит вам");
    }

    // 4. Check status
    if (resultData.status === "completed") {
      throw new HttpsError("failed-precondition", "Тест уже завершён");
    }

    // 5. Check time — use submitted answers if within grace period, else use auto-saved
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

    // 6. Grade using optionsMap for index back-mapping
    const questionIds: string[] = resultData.questionIds || [];
    const resultOptionsMap: Record<string, number[]> | undefined = resultData.optionsMap;

    const { correctCount, score, total, wrongQuestionIds, gradedAnswers } =
      await gradeAnswers(resultData.testId, questionIds, answersToGrade, resultOptionsMap);

    // 7. Update result
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

// ─── One-time migration: denormalize TestResult + Class ──────────────

export const migrateResultsData = onCall(
  { timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Необходима авторизация");
    }

    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    if (userDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Только администратор");
    }

    const testsSnap = await db.collection("tests").get();
    const testMap = new Map<
      string,
      { classLevel: number; subjectId: string; subject: string; testBankId: string }
    >();
    for (const d of testsSnap.docs) {
      const data = d.data();
      testMap.set(d.id, {
        classLevel: data.classLevel,
        subjectId: data.subjectId,
        subject: data.subject,
        testBankId: data.testBankId,
      });
    }

    const resultsSnap = await db.collection("results").get();
    let resultsUpdated = 0;
    let resultsSkipped = 0;
    const BATCH_SIZE = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const resultDoc of resultsSnap.docs) {
      const data = resultDoc.data();

      if (data.classLevel !== undefined && data.subjectId !== undefined && data.testBankId !== undefined) {
        resultsSkipped++;
        continue;
      }

      const testInfo = testMap.get(data.testId);
      if (!testInfo) {
        resultsSkipped++;
        continue;
      }

      batch.update(resultDoc.ref, {
        classLevel: testInfo.classLevel,
        subjectId: testInfo.subjectId,
        subject: testInfo.subject,
        testBankId: testInfo.testBankId,
      });
      batchCount++;
      resultsUpdated++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();

    const classesSnap = await db.collection("classes").get();
    let classesUpdated = 0;
    batch = db.batch();
    batchCount = 0;

    for (const classDoc of classesSnap.docs) {
      const data = classDoc.data();
      if (data.classLevel !== undefined) continue;

      const match = data.name?.match(/^(\d+)/);
      if (!match) continue;
      const level = parseInt(match[1], 10);
      if (![7, 8, 9, 10, 11].includes(level)) continue;

      batch.update(classDoc.ref, { classLevel: level });
      batchCount++;
      classesUpdated++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();

    return {
      results: { updated: resultsUpdated, skipped: resultsSkipped, total: resultsSnap.size },
      classes: { updated: classesUpdated, total: classesSnap.size },
    };
  }
);

// ─── One-time migration: delete legacy in_progress results without shuffledQuestions ──

export const cleanupOldResults = onCall(
  { timeoutSeconds: 540, memory: "256MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Необходима авторизация");
    }

    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    if (userDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Только администратор");
    }

    const { dryRun = false } = (request.data ?? {}) as { dryRun?: boolean };

    // Firestore cannot query "field does not exist" directly —
    // fetch all in_progress and filter in memory.
    const snap = await db
      .collection("results")
      .where("status", "==", "in_progress")
      .get();

    const toDelete = snap.docs.filter(
      (d) => !d.data().shuffledQuestions
    );

    if (dryRun) {
      return {
        dryRun: true,
        found: toDelete.length,
        total: snap.size,
        ids: toDelete.map((d) => d.id),
      };
    }

    // Delete in batches of 500 (Firestore limit)
    const BATCH_SIZE = 500;
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = db.batch();
      toDelete.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += Math.min(BATCH_SIZE, toDelete.length - i);
    }

    console.log(`cleanupOldResults: deleted ${deleted} legacy in_progress docs`);

    return { dryRun: false, deleted, total: snap.size };
  }
);

// ─── Trigger: cleanup on user delete ─────────────────────────────────

export const onUserDeleted = onDocumentDeleted("users/{uid}", async (event) => {
  const uid = event.params.uid;

  try {
    await getAuth().deleteUser(uid);
    console.log(`Auth account deleted for uid: ${uid}`);
  } catch (err: unknown) {
    if (
      err instanceof Object &&
      "code" in err &&
      (err as { code: string }).code === "auth/user-not-found"
    ) {
      console.log(`Auth account not found for uid: ${uid} (already deleted)`);
    } else {
      console.error(`Failed to delete Auth account for uid: ${uid}`, err);
    }
  }
});
