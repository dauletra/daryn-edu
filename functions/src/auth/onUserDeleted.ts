import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { getAuth } from "firebase-admin/auth";
import "../firebaseAdmin"; // ensures admin app is initialized

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
