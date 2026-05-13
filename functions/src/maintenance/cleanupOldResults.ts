import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";

/** One-time cleanup: delete legacy in_progress results that lack shuffledQuestions. */
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

    const toDelete = snap.docs.filter((d) => !d.data().shuffledQuestions);

    if (dryRun) {
      return {
        dryRun: true,
        found: toDelete.length,
        total: snap.size,
        ids: toDelete.map((d) => d.id),
      };
    }

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
