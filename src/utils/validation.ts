export interface ValidationRule {
  validate: (value: string) => boolean
  message: string
}

export const required: ValidationRule = {
  validate: (v) => v.trim().length > 0,
  message: 'Міндетті өріс',
}

export const emailRule: ValidationRule = {
  validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  message: 'Қате email форматы',
}

export const minLength = (min: number): ValidationRule => ({
  validate: (v) => v.length >= min,
  message: `Кемінде ${min} таңба`,
})

export function validateField(value: string, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    if (!rule.validate(value)) return rule.message
  }
  return null
}
