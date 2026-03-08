const map: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya', ә: 'a', і: 'i', ң: 'n', ғ: 'g', ү: 'u', ұ: 'u', қ: 'q',
  ө: 'o', һ: 'h',
}

export function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]/g, '')
}

export function generateEmailFromName(surname: string, name: string, index?: number): string {
  const s = transliterate(surname)
  const n = transliterate(name)
  const suffix = index != null ? String(index) : ''
  return `${s}.${n}${suffix}@edu.test`
}

export function generatePassword(length = 8): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  return password
}
