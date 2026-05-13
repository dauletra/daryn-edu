import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";

// initializeApp() must be called once per cold start.
// Guard against double-initialization when modules are imported in different orders.
if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();
export const claudeApiKey = defineSecret("CLAUDE_API_KEY");
