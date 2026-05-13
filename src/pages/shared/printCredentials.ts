interface CredentialRow {
  name: string
  email: string
  plainPassword?: string
}

/**
 * Open a print-friendly window with student credentials and trigger window.print().
 * Pure function — no React/state dependency, safe to share between pages.
 */
export function printCredentials(className: string, students: CredentialRow[]): void {
  if (students.length === 0) return

  const rows = students
    .map(
      (s, i) =>
        `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.email}</td><td>${s.plainPassword ?? '—'}</td></tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${className} — Кіру деректері</title>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  h2 { margin-bottom: 4px; }
  p { color: #666; margin-bottom: 16px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  td:first-child { width: 30px; text-align: center; }
  @media print { body { padding: 0; } }
</style></head><body>
<h2>${className}</h2>
<p>Оқушылардың кіру деректері</p>
<table><thead><tr><th>#</th><th>Аты-жөні</th><th>Email</th><th>Құпиясөз</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=()=>{window.print()}</script>
</body></html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
