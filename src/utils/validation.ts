export interface ValidationRule {
  validate: (value: string) => boolean
  message: string
}

export const required: ValidationRule = {
  validate: (v) => v.trim().length > 0,
  message: 'Обязательное поле',
}

export const emailRule: ValidationRule = {
  validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  message: 'Некорректный email',
}

export const minLength = (min: number): ValidationRule => ({
  validate: (v) => v.length >= min,
  message: `Минимум ${min} символов`,
})

export function validateField(value: string, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    if (!rule.validate(value)) return rule.message
  }
  return null
}
