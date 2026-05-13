import { useCallback, useEffect, useState } from 'react'
import { FloatingTool } from './FloatingTool'

interface CalculatorProps {
  onClose: () => void
}

function evaluate(expr: string): number {
  let pos = 0
  const s = expr

  const peek = () => s[pos]
  const peek2 = () => s[pos + 1]
  const next = () => s[pos++]
  const skipSpace = () => { while (pos < s.length && s[pos] === ' ') pos++ }

  function parseExpr(): number {
    let left = parseTerm()
    skipSpace()
    while (peek() === '+' || peek() === '-' || peek() === '−') {
      const op = next()
      const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  function parseTerm(): number {
    let left = parseFactor()
    skipSpace()
    while (peek() === '*' || peek() === '/' || peek() === '×' || peek() === '÷') {
      const op = next()
      const right = parseFactor()
      left = op === '*' || op === '×' ? left * right : left / right
    }
    return left
  }

  function parseFactor(): number {
    let val = parseUnary()
    skipSpace()
    while (peek() === '²' || (peek() === '⁻' && peek2() === '¹')) {
      if (peek() === '²') { next(); val = val * val }
      else { pos += 2; val = 1 / val }
      skipSpace()
    }
    return val
  }

  function parseUnary(): number {
    skipSpace()
    if (peek() === '-' || peek() === '−') { next(); return -parseUnary() }
    if (peek() === '+') { next(); return parseUnary() }
    if (peek() === '√') { next(); return Math.sqrt(parseUnary()) }
    return parsePrimary()
  }

  function parsePrimary(): number {
    skipSpace()
    if (peek() === '(') {
      next()
      const v = parseExpr()
      skipSpace()
      if (peek() !== ')') throw new Error('expected )')
      next()
      return v
    }
    const start = pos
    while (pos < s.length && /[0-9.]/.test(s[pos])) pos++
    if (start === pos) throw new Error('expected number')
    const num = parseFloat(s.slice(start, pos))
    if (!Number.isFinite(num)) throw new Error('bad number')
    return num
  }

  const result = parseExpr()
  skipSpace()
  if (pos < s.length) throw new Error('trailing input')
  if (!Number.isFinite(result)) throw new Error('non-finite')
  return result
}

function formatResult(n: number): string {
  if (!Number.isFinite(n)) return 'Қате'
  // Round to ~12 significant digits to hide float noise (0.1 + 0.2 etc.)
  const rounded = Number(n.toPrecision(12))
  return String(rounded)
}

export function Calculator({ onClose }: CalculatorProps) {
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('0')
  const [justEvaluated, setJustEvaluated] = useState(false)
  const [error, setError] = useState(false)

  const isOperator = (c: string) => '+-−*/×÷'.includes(c)

  const append = useCallback((token: string) => {
    setError(false)
    setExpr((prev) => {
      // If just showed result, decide: digit/'(' starts fresh; operator continues with result
      if (justEvaluated) {
        setJustEvaluated(false)
        if (/[0-9.]/.test(token) || token === '(' || token === '√') {
          return token
        }
        // Operator or postfix: continue from result
        return result + token
      }
      return prev + token
    })
  }, [justEvaluated, result])

  const clear = useCallback(() => {
    setExpr('')
    setResult('0')
    setError(false)
    setJustEvaluated(false)
  }, [])

  const backspace = useCallback(() => {
    setError(false)
    if (justEvaluated) {
      clear()
      return
    }
    setExpr((prev) => {
      // ⁻¹ is two chars
      if (prev.endsWith('⁻¹')) return prev.slice(0, -2)
      return prev.slice(0, -1)
    })
  }, [justEvaluated, clear])

  const equals = useCallback(() => {
    if (!expr.trim()) return
    try {
      const value = evaluate(expr)
      setResult(formatResult(value))
      setJustEvaluated(true)
      setError(false)
    } catch {
      setError(true)
    }
  }, [expr])

  // Keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept while typing in inputs (none in test page, but safe)
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const k = e.key
      if (/^[0-9]$/.test(k)) { append(k); e.preventDefault(); return }
      if (k === '.') { append('.'); e.preventDefault(); return }
      if (k === '+') { append('+'); e.preventDefault(); return }
      if (k === '-') { append('−'); e.preventDefault(); return }
      if (k === '*') { append('×'); e.preventDefault(); return }
      if (k === '/') { append('÷'); e.preventDefault(); return }
      if (k === '(' || k === ')') { append(k); e.preventDefault(); return }
      if (k === 'Enter' || k === '=') { equals(); e.preventDefault(); return }
      if (k === 'Backspace') { backspace(); e.preventDefault(); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [append, equals, backspace])

  // Smart insertion helpers
  const lastChar = expr.slice(-1)
  const expectsNumber = !expr || isOperator(lastChar) || lastChar === '('

  const onPostfix = (token: string) => {
    // x² / ⁻¹ only after number or ')' or another postfix
    if (justEvaluated) {
      setExpr(result + token)
      setJustEvaluated(false)
      return
    }
    if (!expr) return
    if (expectsNumber) return
    setExpr(expr + token)
  }

  const onSqrt = () => append('√')

  const display = error ? 'Қате' : justEvaluated ? result : (expr || '0')

  const btn =
    'h-11 rounded-lg font-medium text-base transition-colors cursor-pointer select-none'
  const num = `${btn} bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300`
  const op = `${btn} bg-blue-100 text-blue-800 hover:bg-blue-200 active:bg-blue-300`
  const fn = `${btn} bg-amber-100 text-amber-800 hover:bg-amber-200 active:bg-amber-300`
  const eq = `${btn} bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800`
  const cl = `${btn} bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300`

  return (
    <FloatingTool title="Калькулятор" onClose={onClose} width={280}>
      <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 min-h-[68px] flex flex-col items-end justify-end">
        {!justEvaluated && expr && (
          <div className="text-xs text-gray-500 truncate w-full text-right">{expr}</div>
        )}
        <div
          className={`text-2xl font-mono font-semibold truncate w-full text-right ${
            error ? 'text-red-600' : 'text-gray-900'
          }`}
        >
          {display}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button onClick={clear} className={cl}>C</button>
        <button onClick={backspace} className={cl}>←</button>
        <button onClick={() => append('(')} className={fn}>(</button>
        <button onClick={() => append(')')} className={fn}>)</button>

        <button onClick={onSqrt} className={fn}>√</button>
        <button onClick={() => onPostfix('²')} className={fn}>x²</button>
        <button onClick={() => onPostfix('⁻¹')} className={fn}>1/x</button>
        <button onClick={() => append('÷')} className={op}>÷</button>

        <button onClick={() => append('7')} className={num}>7</button>
        <button onClick={() => append('8')} className={num}>8</button>
        <button onClick={() => append('9')} className={num}>9</button>
        <button onClick={() => append('×')} className={op}>×</button>

        <button onClick={() => append('4')} className={num}>4</button>
        <button onClick={() => append('5')} className={num}>5</button>
        <button onClick={() => append('6')} className={num}>6</button>
        <button onClick={() => append('−')} className={op}>−</button>

        <button onClick={() => append('1')} className={num}>1</button>
        <button onClick={() => append('2')} className={num}>2</button>
        <button onClick={() => append('3')} className={num}>3</button>
        <button onClick={() => append('+')} className={op}>+</button>

        <button onClick={() => append('0')} className={`${num} col-span-2`}>0</button>
        <button onClick={() => append('.')} className={num}>.</button>
        <button onClick={equals} className={eq}>=</button>
      </div>
    </FloatingTool>
  )
}
