import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";

const VALID_TYPES = new Set([
  "fullscreen_exit",
  "tab_hidden",
  "window_blur",
  "copy_attempt",
  "paste_attempt",
  "context_menu",
  "back_attempt",
  "devtools_shortcut",
  "print_attempt",
]);

/** Cap to prevent abuse (e.g. malicious client spamming events). */
const MAX_EVENTS_PER_CALL = 50;
/** Hard cap on total events stored per result (protects doc size + reads). */
const MAX_EVENTS_PER_RESULT = 500;

/**
 * Append anti-cheating audit events to a TestResult.
 * Client batches events and flushes periodically (see TestTakingPage).
 *
 * Cost: 1 read + 1 write per batched call. Client should debounce.
 */
export const logTestEvent = onCall(
  { timeoutSeconds: 10 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Необходима авторизация");
    }

    const uid = request.auth.uid;
    const { resultId, events } = request.data as {
      resultId: string;
      events: { type: string; at: number }[];
    };

    if (!resultId || typeof resultId !== "string") {
      throw new HttpsError("invalid-argument", "resultId обязателен");
    }

    if (!Array.isArray(events) || events.length === 0) {
      return { logged: 0 };
    }

    if (events.length > MAX_EVENTS_PER_CALL) {
      throw new HttpsError("invalid-argument", "Слишком много событий за один вызов");
    }

    // Validate event shape + types
    const sanitized: { type: string; at: Timestamp }[] = [];
    for (const e of events) {
      if (!e || typeof e !== "object") continue;
      if (typeof e.type !== "string" || !VALID_TYPES.has(e.type)) continue;
      const atMs = typeof e.at === "number" ? e.at : Date.now();
      sanitized.push({ type: e.type, at: Timestamp.fromMillis(atMs) });
    }

    if (sanitized.length === 0) {
      return { logged: 0 };
    }

    // Verify result ownership and status
    const resultRef = db.collection("results").doc(resultId);
    const resultDoc = await resultRef.get();
    if (!resultDoc.exists) {
      throw new HttpsError("not-found", "Результат не найден");
    }
    const resultData = resultDoc.data()!;
    if (resultData.studentId !== uid) {
      throw new HttpsError("permission-denied", "Результат не принадлежит вам");
    }
    if (resultData.status !== "in_progress") {
      // Silently ignore — test already finished, nothing to log
      return { logged: 0 };
    }

    // Enforce hard cap
    const existing: unknown[] = Array.isArray(resultData.events) ? resultData.events : [];
    const room = Math.max(0, MAX_EVENTS_PER_RESULT - existing.length);
    if (room === 0) {
      return { logged: 0 };
    }
    const toAppend = sanitized.slice(0, room);

    await resultRef.update({
      events: FieldValue.arrayUnion(...toAppend),
    });

    return { logged: toAppend.length };
  }
);
