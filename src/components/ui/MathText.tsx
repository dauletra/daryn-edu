import { useMemo } from 'react'
import katex from 'katex'

interface MathTextProps {
  text: string
  className?: string
}

/**
 * Renders text with KaTeX math formulas.
 * Supports:
 *   $$...$$ — block math (display mode)
 *   $...$  — inline math
 * Plain text is rendered as-is.
 */
export function MathText({ text, className }: MathTextProps) {
  const html = useMemo(() => renderMathText(text), [text])

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// Regex: match $$...$$ (block) or $...$ (inline), non-greedy
// Uses a single pass regex that captures block formulas first, then inline
const MATH_REGEX = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g

function renderMathText(text: string): string {
  if (!text) return ''
  // Quick check: if no $ at all, skip regex processing
  if (!text.includes('$')) return escapeHtml(text)

  const parts: string[] = []
  let lastIndex = 0

  for (const match of text.matchAll(MATH_REGEX)) {
    const fullMatch = match[0]
    const blockFormula = match[1]  // $$...$$ content
    const inlineFormula = match[2] // $...$ content
    const startIdx = match.index!

    // Add plain text before this match
    if (startIdx > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, startIdx)))
    }

    const formula = blockFormula ?? inlineFormula
    const displayMode = blockFormula !== undefined

    try {
      parts.push(
        katex.renderToString(formula, {
          displayMode,
          throwOnError: false,
          output: 'html',
        })
      )
    } catch {
      // If KaTeX fails, show the raw formula
      parts.push(escapeHtml(fullMatch))
    }

    lastIndex = startIdx + fullMatch.length
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)))
  }

  return parts.join('')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
