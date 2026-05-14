/**
 * Standard school-level solubility table.
 *
 * Legend (matches Kazakhstan/Russian school chemistry textbooks):
 *   Р — растворим (≥1 g per 100 g water)
 *   М — малорастворим (0.01–1 g per 100 g)
 *   Н — нерастворим (<0.01 g per 100 g)
 *   Г — газ (выделяется)
 *   — — соединение не существует / разлагается в воде
 *
 * Rows = anions (across the top), columns = cations (down the left side) is
 * the textbook orientation, but we store it as cations × anions for indexing.
 */

export type Solubility = 'Р' | 'М' | 'Н' | 'Г' | '—'

export const CATIONS = [
  { sym: 'H⁺', label: 'H⁺' },
  { sym: 'Li⁺', label: 'Li⁺' },
  { sym: 'Na⁺', label: 'Na⁺' },
  { sym: 'K⁺', label: 'K⁺' },
  { sym: 'NH₄⁺', label: 'NH₄⁺' },
  { sym: 'Ag⁺', label: 'Ag⁺' },
  { sym: 'Mg²⁺', label: 'Mg²⁺' },
  { sym: 'Ca²⁺', label: 'Ca²⁺' },
  { sym: 'Sr²⁺', label: 'Sr²⁺' },
  { sym: 'Ba²⁺', label: 'Ba²⁺' },
  { sym: 'Zn²⁺', label: 'Zn²⁺' },
  { sym: 'Cu²⁺', label: 'Cu²⁺' },
  { sym: 'Hg²⁺', label: 'Hg²⁺' },
  { sym: 'Pb²⁺', label: 'Pb²⁺' },
  { sym: 'Mn²⁺', label: 'Mn²⁺' },
  { sym: 'Fe²⁺', label: 'Fe²⁺' },
  { sym: 'Fe³⁺', label: 'Fe³⁺' },
  { sym: 'Al³⁺', label: 'Al³⁺' },
] as const

export const ANIONS = [
  { sym: 'OH⁻', label: 'OH⁻' },
  { sym: 'NO₃⁻', label: 'NO₃⁻' },
  { sym: 'F⁻', label: 'F⁻' },
  { sym: 'Cl⁻', label: 'Cl⁻' },
  { sym: 'Br⁻', label: 'Br⁻' },
  { sym: 'I⁻', label: 'I⁻' },
  { sym: 'S²⁻', label: 'S²⁻' },
  { sym: 'SO₃²⁻', label: 'SO₃²⁻' },
  { sym: 'SO₄²⁻', label: 'SO₄²⁻' },
  { sym: 'CO₃²⁻', label: 'CO₃²⁻' },
  { sym: 'SiO₃²⁻', label: 'SiO₃²⁻' },
  { sym: 'PO₄³⁻', label: 'PO₄³⁻' },
  { sym: 'CH₃COO⁻', label: 'CH₃COO⁻' },
] as const

/** [cationIndex][anionIndex] → solubility code. Values follow the standard
 *  Kazakh school chemistry textbook (Маймаков, Кулажанов). */
export const SOLUBILITY: Solubility[][] = [
  // H⁺   OH⁻ NO₃⁻ F⁻  Cl⁻ Br⁻ I⁻  S²⁻ SO₃²⁻ SO₄²⁻ CO₃²⁻ SiO₃²⁻ PO₄³⁻ CH₃COO⁻
  /* H⁺  */ ['Р','Р','Р','Р','Р','Р','Р','Р','Р','Р','Н','Р','Р'],
  /* Li⁺ */ ['Р','Р','М','Р','Р','Р','Р','Р','Р','Р','Р','Н','Р'],
  /* Na⁺ */ ['Р','Р','Р','Р','Р','Р','Р','Р','Р','Р','Р','Р','Р'],
  /* K⁺  */ ['Р','Р','Р','Р','Р','Р','Р','Р','Р','Р','Р','Р','Р'],
  /* NH₄⁺*/ ['Р','Р','Р','Р','Р','Р','Р','Р','Р','Р','—','Р','Р'],
  /* Ag⁺ */ ['—','Р','Р','Н','Н','Н','Н','—','М','Н','Н','Н','Р'],
  /* Mg²⁺*/ ['Н','Р','М','Р','Р','Р','М','Р','Р','Н','Н','Н','Р'],
  /* Ca²⁺*/ ['М','Р','Н','Р','Р','Р','М','М','М','Н','Н','Н','Р'],
  /* Sr²⁺*/ ['М','Р','Н','Р','Р','Р','Р','Н','Н','Н','Н','Н','Р'],
  /* Ba²⁺*/ ['Р','Р','М','Р','Р','Р','Р','Н','Н','Н','Н','Н','Р'],
  /* Zn²⁺*/ ['Н','Р','М','Р','Р','Р','Н','Н','Р','Н','Н','Н','Р'],
  /* Cu²⁺*/ ['Н','Р','Р','Р','Р','—','Н','—','Р','Н','—','Н','Р'],
  /* Hg²⁺*/ ['—','Р','—','Р','М','Н','Н','—','Р','—','—','Н','Р'],
  /* Pb²⁺*/ ['Н','Р','Н','М','М','Н','Н','Н','Н','Н','Н','Н','Р'],
  /* Mn²⁺*/ ['Н','Р','Р','Р','Р','Р','Н','Н','Р','Н','Н','Н','Р'],
  /* Fe²⁺*/ ['Н','Р','М','Р','Р','Р','Н','Н','Р','Н','Н','Н','Р'],
  /* Fe³⁺*/ ['Н','Р','Р','Р','Р','—','—','—','Р','—','—','Н','Р'],
  /* Al³⁺*/ ['Н','Р','М','Р','Р','Р','—','—','Р','—','—','Н','Р'],
]

export const SOLUBILITY_COLORS: Record<Solubility, string> = {
  'Р': 'bg-green-100 text-green-900',
  'М': 'bg-yellow-100 text-yellow-900',
  'Н': 'bg-red-100 text-red-900',
  'Г': 'bg-blue-100 text-blue-900',
  '—': 'bg-gray-200 text-gray-500',
}

export const SOLUBILITY_LABELS: Record<Solubility, string> = {
  'Р': 'Ериді',
  'М': 'Аз ериді',
  'Н': 'Ерімейді',
  'Г': 'Газ',
  '—': 'Жоқ / ыдырайды',
}
