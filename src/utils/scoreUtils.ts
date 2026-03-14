/**
 * Shared score thresholds used across the application.
 *
 * ≥ 85%  → grade 5 (green)
 * 65–84% → grade 4 (blue)
 * 40–64% → grade 3 (yellow)
 * ≤ 39%  → grade 2 (red)
 */

/** Returns numeric grade 2–5 for a given score percent. */
export function getGrade(score: number): number {
  return score >= 85 ? 5 : score >= 65 ? 4 : score >= 40 ? 3 : 2
}

/** Returns Tailwind bg+text classes for inline score badges. */
export function getScoreColor(score: number): string {
  return score >= 85
    ? 'bg-green-100 text-green-800'
    : score >= 65
      ? 'bg-blue-100 text-blue-800'
      : score >= 40
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800'
}

/** Returns Badge variant for use with the <Badge> component. */
export function getScoreVariant(score: number): 'success' | 'info' | 'warning' | 'danger' {
  return score >= 85 ? 'success' : score >= 65 ? 'info' : score >= 40 ? 'warning' : 'danger'
}

/** Returns Tailwind bg+text classes for grade badges (2–5). */
export function getGradeColor(grade: number): string {
  return grade >= 5
    ? 'bg-green-100 text-green-800'
    : grade >= 4
      ? 'bg-blue-100 text-blue-800'
      : grade >= 3
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800'
}
