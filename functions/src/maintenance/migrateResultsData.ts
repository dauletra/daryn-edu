import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";

/** One-time migration: denormalize TestResult + Class. */
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
