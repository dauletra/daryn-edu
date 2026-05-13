/**
 * Cloud Functions entrypoint.
 *
 * Each function is defined in its own file; this index only re-exports them
 * so Firebase can discover them at deploy time. Splitting keeps cold-start
 * bundle small per function (e.g. submitTest doesn't load the AI prompt).
 */

export { generateQuestions } from "./ai/generateQuestions";
export { startTest } from "./tests/startTest";
export { submitTest } from "./tests/submitTest";
export { migrateResultsData } from "./maintenance/migrateResultsData";
export { cleanupOldResults } from "./maintenance/cleanupOldResults";
export { onUserDeleted } from "./auth/onUserDeleted";
