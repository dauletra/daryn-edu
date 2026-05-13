import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";

export const DAILY_REQUEST_LIMIT = 50;

export async function checkRateLimit(uid: string): Promise<void> {
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
