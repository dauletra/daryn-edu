/**
 * Helpers to repair JSON returned by the AI when it contains LaTeX escapes
 * that aren't valid JSON (e.g. `\frac` instead of `\\frac`).
 */

export function fixLatexEscapes(rawJson: string): string {
  let fixed = rawJson.replace(/(?<!\\)\\([ftnrb])([a-zA-Z])/g, "\\\\$1$2");
  fixed = fixed.replace(/(?<!\\)\\(?![\\/"bfnrtu])/g, "\\\\");
  return fixed;
}

export function fixControlChars(text: string): string {
  return text
    .replace(/\f([a-zA-Z])/g, "\\f$1")
    .replace(/\t([a-zA-Z])/g, "\\t$1")
    .replace(/\n([a-zA-Z])/g, "\\n$1")
    .replace(/\r([a-zA-Z])/g, "\\r$1")
    .replace(/[\x08]([a-zA-Z])/g, "\\b$1");
}
