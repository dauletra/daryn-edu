export type ElementCategory =
  | 'alkali'
  | 'alkaline'
  | 'transition'
  | 'post-transition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble'
  | 'lanthanide'
  | 'actinide'

export interface PeriodicElement {
  n: number
  sym: string
  nameKz: string
  nameRu: string
  mass: number | string
  cat: ElementCategory
}

/** Russian-cognate Kazakh names. Where Kazakh has an established native term
 *  (Сутегі, Көміртек, Оттек, Күкірт, Темір, Мыс, Күміс, Алтын, Сынап, Қорғасын),
 *  it is preferred over the Russian transliteration. */
export const ELEMENTS: readonly PeriodicElement[] = [
  { n: 1, sym: 'H', nameKz: 'Сутегі', nameRu: 'Водород', mass: 1.008, cat: 'nonmetal' },
  { n: 2, sym: 'He', nameKz: 'Гелий', nameRu: 'Гелий', mass: 4.003, cat: 'noble' },
  { n: 3, sym: 'Li', nameKz: 'Литий', nameRu: 'Литий', mass: 6.94, cat: 'alkali' },
  { n: 4, sym: 'Be', nameKz: 'Бериллий', nameRu: 'Бериллий', mass: 9.012, cat: 'alkaline' },
  { n: 5, sym: 'B', nameKz: 'Бор', nameRu: 'Бор', mass: 10.81, cat: 'metalloid' },
  { n: 6, sym: 'C', nameKz: 'Көміртек', nameRu: 'Углерод', mass: 12.011, cat: 'nonmetal' },
  { n: 7, sym: 'N', nameKz: 'Азот', nameRu: 'Азот', mass: 14.007, cat: 'nonmetal' },
  { n: 8, sym: 'O', nameKz: 'Оттек', nameRu: 'Кислород', mass: 15.999, cat: 'nonmetal' },
  { n: 9, sym: 'F', nameKz: 'Фтор', nameRu: 'Фтор', mass: 18.998, cat: 'halogen' },
  { n: 10, sym: 'Ne', nameKz: 'Неон', nameRu: 'Неон', mass: 20.180, cat: 'noble' },
  { n: 11, sym: 'Na', nameKz: 'Натрий', nameRu: 'Натрий', mass: 22.990, cat: 'alkali' },
  { n: 12, sym: 'Mg', nameKz: 'Магний', nameRu: 'Магний', mass: 24.305, cat: 'alkaline' },
  { n: 13, sym: 'Al', nameKz: 'Алюминий', nameRu: 'Алюминий', mass: 26.982, cat: 'post-transition' },
  { n: 14, sym: 'Si', nameKz: 'Кремний', nameRu: 'Кремний', mass: 28.085, cat: 'metalloid' },
  { n: 15, sym: 'P', nameKz: 'Фосфор', nameRu: 'Фосфор', mass: 30.974, cat: 'nonmetal' },
  { n: 16, sym: 'S', nameKz: 'Күкірт', nameRu: 'Сера', mass: 32.06, cat: 'nonmetal' },
  { n: 17, sym: 'Cl', nameKz: 'Хлор', nameRu: 'Хлор', mass: 35.45, cat: 'halogen' },
  { n: 18, sym: 'Ar', nameKz: 'Аргон', nameRu: 'Аргон', mass: 39.948, cat: 'noble' },
  { n: 19, sym: 'K', nameKz: 'Калий', nameRu: 'Калий', mass: 39.098, cat: 'alkali' },
  { n: 20, sym: 'Ca', nameKz: 'Кальций', nameRu: 'Кальций', mass: 40.078, cat: 'alkaline' },
  { n: 21, sym: 'Sc', nameKz: 'Скандий', nameRu: 'Скандий', mass: 44.956, cat: 'transition' },
  { n: 22, sym: 'Ti', nameKz: 'Титан', nameRu: 'Титан', mass: 47.867, cat: 'transition' },
  { n: 23, sym: 'V', nameKz: 'Ванадий', nameRu: 'Ванадий', mass: 50.942, cat: 'transition' },
  { n: 24, sym: 'Cr', nameKz: 'Хром', nameRu: 'Хром', mass: 51.996, cat: 'transition' },
  { n: 25, sym: 'Mn', nameKz: 'Марганец', nameRu: 'Марганец', mass: 54.938, cat: 'transition' },
  { n: 26, sym: 'Fe', nameKz: 'Темір', nameRu: 'Железо', mass: 55.845, cat: 'transition' },
  { n: 27, sym: 'Co', nameKz: 'Кобальт', nameRu: 'Кобальт', mass: 58.933, cat: 'transition' },
  { n: 28, sym: 'Ni', nameKz: 'Никель', nameRu: 'Никель', mass: 58.693, cat: 'transition' },
  { n: 29, sym: 'Cu', nameKz: 'Мыс', nameRu: 'Медь', mass: 63.546, cat: 'transition' },
  { n: 30, sym: 'Zn', nameKz: 'Мырыш', nameRu: 'Цинк', mass: 65.38, cat: 'transition' },
  { n: 31, sym: 'Ga', nameKz: 'Галлий', nameRu: 'Галлий', mass: 69.723, cat: 'post-transition' },
  { n: 32, sym: 'Ge', nameKz: 'Германий', nameRu: 'Германий', mass: 72.630, cat: 'metalloid' },
  { n: 33, sym: 'As', nameKz: 'Мышьяк', nameRu: 'Мышьяк', mass: 74.922, cat: 'metalloid' },
  { n: 34, sym: 'Se', nameKz: 'Селен', nameRu: 'Селен', mass: 78.971, cat: 'nonmetal' },
  { n: 35, sym: 'Br', nameKz: 'Бром', nameRu: 'Бром', mass: 79.904, cat: 'halogen' },
  { n: 36, sym: 'Kr', nameKz: 'Криптон', nameRu: 'Криптон', mass: 83.798, cat: 'noble' },
  { n: 37, sym: 'Rb', nameKz: 'Рубидий', nameRu: 'Рубидий', mass: 85.468, cat: 'alkali' },
  { n: 38, sym: 'Sr', nameKz: 'Стронций', nameRu: 'Стронций', mass: 87.62, cat: 'alkaline' },
  { n: 39, sym: 'Y', nameKz: 'Иттрий', nameRu: 'Иттрий', mass: 88.906, cat: 'transition' },
  { n: 40, sym: 'Zr', nameKz: 'Цирконий', nameRu: 'Цирконий', mass: 91.224, cat: 'transition' },
  { n: 41, sym: 'Nb', nameKz: 'Ниобий', nameRu: 'Ниобий', mass: 92.906, cat: 'transition' },
  { n: 42, sym: 'Mo', nameKz: 'Молибден', nameRu: 'Молибден', mass: 95.95, cat: 'transition' },
  { n: 43, sym: 'Tc', nameKz: 'Технеций', nameRu: 'Технеций', mass: '[98]', cat: 'transition' },
  { n: 44, sym: 'Ru', nameKz: 'Рутений', nameRu: 'Рутений', mass: 101.07, cat: 'transition' },
  { n: 45, sym: 'Rh', nameKz: 'Родий', nameRu: 'Родий', mass: 102.906, cat: 'transition' },
  { n: 46, sym: 'Pd', nameKz: 'Палладий', nameRu: 'Палладий', mass: 106.42, cat: 'transition' },
  { n: 47, sym: 'Ag', nameKz: 'Күміс', nameRu: 'Серебро', mass: 107.868, cat: 'transition' },
  { n: 48, sym: 'Cd', nameKz: 'Кадмий', nameRu: 'Кадмий', mass: 112.414, cat: 'transition' },
  { n: 49, sym: 'In', nameKz: 'Индий', nameRu: 'Индий', mass: 114.818, cat: 'post-transition' },
  { n: 50, sym: 'Sn', nameKz: 'Қалайы', nameRu: 'Олово', mass: 118.710, cat: 'post-transition' },
  { n: 51, sym: 'Sb', nameKz: 'Сурьма', nameRu: 'Сурьма', mass: 121.760, cat: 'metalloid' },
  { n: 52, sym: 'Te', nameKz: 'Теллур', nameRu: 'Теллур', mass: 127.60, cat: 'metalloid' },
  { n: 53, sym: 'I', nameKz: 'Иод', nameRu: 'Иод', mass: 126.904, cat: 'halogen' },
  { n: 54, sym: 'Xe', nameKz: 'Ксенон', nameRu: 'Ксенон', mass: 131.293, cat: 'noble' },
  { n: 55, sym: 'Cs', nameKz: 'Цезий', nameRu: 'Цезий', mass: 132.905, cat: 'alkali' },
  { n: 56, sym: 'Ba', nameKz: 'Барий', nameRu: 'Барий', mass: 137.327, cat: 'alkaline' },
  { n: 57, sym: 'La', nameKz: 'Лантан', nameRu: 'Лантан', mass: 138.905, cat: 'lanthanide' },
  { n: 58, sym: 'Ce', nameKz: 'Церий', nameRu: 'Церий', mass: 140.116, cat: 'lanthanide' },
  { n: 59, sym: 'Pr', nameKz: 'Празеодим', nameRu: 'Празеодим', mass: 140.908, cat: 'lanthanide' },
  { n: 60, sym: 'Nd', nameKz: 'Неодим', nameRu: 'Неодим', mass: 144.242, cat: 'lanthanide' },
  { n: 61, sym: 'Pm', nameKz: 'Прометий', nameRu: 'Прометий', mass: '[145]', cat: 'lanthanide' },
  { n: 62, sym: 'Sm', nameKz: 'Самарий', nameRu: 'Самарий', mass: 150.36, cat: 'lanthanide' },
  { n: 63, sym: 'Eu', nameKz: 'Европий', nameRu: 'Европий', mass: 151.964, cat: 'lanthanide' },
  { n: 64, sym: 'Gd', nameKz: 'Гадолиний', nameRu: 'Гадолиний', mass: 157.25, cat: 'lanthanide' },
  { n: 65, sym: 'Tb', nameKz: 'Тербий', nameRu: 'Тербий', mass: 158.925, cat: 'lanthanide' },
  { n: 66, sym: 'Dy', nameKz: 'Диспрозий', nameRu: 'Диспрозий', mass: 162.500, cat: 'lanthanide' },
  { n: 67, sym: 'Ho', nameKz: 'Гольмий', nameRu: 'Гольмий', mass: 164.930, cat: 'lanthanide' },
  { n: 68, sym: 'Er', nameKz: 'Эрбий', nameRu: 'Эрбий', mass: 167.259, cat: 'lanthanide' },
  { n: 69, sym: 'Tm', nameKz: 'Тулий', nameRu: 'Тулий', mass: 168.934, cat: 'lanthanide' },
  { n: 70, sym: 'Yb', nameKz: 'Иттербий', nameRu: 'Иттербий', mass: 173.045, cat: 'lanthanide' },
  { n: 71, sym: 'Lu', nameKz: 'Лютеций', nameRu: 'Лютеций', mass: 174.967, cat: 'lanthanide' },
  { n: 72, sym: 'Hf', nameKz: 'Гафний', nameRu: 'Гафний', mass: 178.49, cat: 'transition' },
  { n: 73, sym: 'Ta', nameKz: 'Тантал', nameRu: 'Тантал', mass: 180.948, cat: 'transition' },
  { n: 74, sym: 'W', nameKz: 'Вольфрам', nameRu: 'Вольфрам', mass: 183.84, cat: 'transition' },
  { n: 75, sym: 'Re', nameKz: 'Рений', nameRu: 'Рений', mass: 186.207, cat: 'transition' },
  { n: 76, sym: 'Os', nameKz: 'Осмий', nameRu: 'Осмий', mass: 190.23, cat: 'transition' },
  { n: 77, sym: 'Ir', nameKz: 'Иридий', nameRu: 'Иридий', mass: 192.217, cat: 'transition' },
  { n: 78, sym: 'Pt', nameKz: 'Платина', nameRu: 'Платина', mass: 195.084, cat: 'transition' },
  { n: 79, sym: 'Au', nameKz: 'Алтын', nameRu: 'Золото', mass: 196.967, cat: 'transition' },
  { n: 80, sym: 'Hg', nameKz: 'Сынап', nameRu: 'Ртуть', mass: 200.592, cat: 'transition' },
  { n: 81, sym: 'Tl', nameKz: 'Таллий', nameRu: 'Таллий', mass: 204.38, cat: 'post-transition' },
  { n: 82, sym: 'Pb', nameKz: 'Қорғасын', nameRu: 'Свинец', mass: 207.2, cat: 'post-transition' },
  { n: 83, sym: 'Bi', nameKz: 'Висмут', nameRu: 'Висмут', mass: 208.980, cat: 'post-transition' },
  { n: 84, sym: 'Po', nameKz: 'Полоний', nameRu: 'Полоний', mass: '[209]', cat: 'metalloid' },
  { n: 85, sym: 'At', nameKz: 'Астат', nameRu: 'Астат', mass: '[210]', cat: 'halogen' },
  { n: 86, sym: 'Rn', nameKz: 'Радон', nameRu: 'Радон', mass: '[222]', cat: 'noble' },
  { n: 87, sym: 'Fr', nameKz: 'Франций', nameRu: 'Франций', mass: '[223]', cat: 'alkali' },
  { n: 88, sym: 'Ra', nameKz: 'Радий', nameRu: 'Радий', mass: '[226]', cat: 'alkaline' },
  { n: 89, sym: 'Ac', nameKz: 'Актиний', nameRu: 'Актиний', mass: '[227]', cat: 'actinide' },
  { n: 90, sym: 'Th', nameKz: 'Торий', nameRu: 'Торий', mass: 232.038, cat: 'actinide' },
  { n: 91, sym: 'Pa', nameKz: 'Протактиний', nameRu: 'Протактиний', mass: 231.036, cat: 'actinide' },
  { n: 92, sym: 'U', nameKz: 'Уран', nameRu: 'Уран', mass: 238.029, cat: 'actinide' },
  { n: 93, sym: 'Np', nameKz: 'Нептуний', nameRu: 'Нептуний', mass: '[237]', cat: 'actinide' },
  { n: 94, sym: 'Pu', nameKz: 'Плутоний', nameRu: 'Плутоний', mass: '[244]', cat: 'actinide' },
  { n: 95, sym: 'Am', nameKz: 'Америций', nameRu: 'Америций', mass: '[243]', cat: 'actinide' },
  { n: 96, sym: 'Cm', nameKz: 'Кюрий', nameRu: 'Кюрий', mass: '[247]', cat: 'actinide' },
  { n: 97, sym: 'Bk', nameKz: 'Берклий', nameRu: 'Берклий', mass: '[247]', cat: 'actinide' },
  { n: 98, sym: 'Cf', nameKz: 'Калифорний', nameRu: 'Калифорний', mass: '[251]', cat: 'actinide' },
  { n: 99, sym: 'Es', nameKz: 'Эйнштейний', nameRu: 'Эйнштейний', mass: '[252]', cat: 'actinide' },
  { n: 100, sym: 'Fm', nameKz: 'Фермий', nameRu: 'Фермий', mass: '[257]', cat: 'actinide' },
  { n: 101, sym: 'Md', nameKz: 'Менделевий', nameRu: 'Менделевий', mass: '[258]', cat: 'actinide' },
  { n: 102, sym: 'No', nameKz: 'Нобелий', nameRu: 'Нобелий', mass: '[259]', cat: 'actinide' },
  { n: 103, sym: 'Lr', nameKz: 'Лоуренсий', nameRu: 'Лоуренсий', mass: '[266]', cat: 'actinide' },
  { n: 104, sym: 'Rf', nameKz: 'Резерфордий', nameRu: 'Резерфордий', mass: '[267]', cat: 'transition' },
  { n: 105, sym: 'Db', nameKz: 'Дубний', nameRu: 'Дубний', mass: '[268]', cat: 'transition' },
  { n: 106, sym: 'Sg', nameKz: 'Сиборгий', nameRu: 'Сиборгий', mass: '[269]', cat: 'transition' },
  { n: 107, sym: 'Bh', nameKz: 'Борий', nameRu: 'Борий', mass: '[270]', cat: 'transition' },
  { n: 108, sym: 'Hs', nameKz: 'Хассий', nameRu: 'Хассий', mass: '[277]', cat: 'transition' },
  { n: 109, sym: 'Mt', nameKz: 'Мейтнерий', nameRu: 'Мейтнерий', mass: '[278]', cat: 'transition' },
  { n: 110, sym: 'Ds', nameKz: 'Дармштадтий', nameRu: 'Дармштадтий', mass: '[281]', cat: 'transition' },
  { n: 111, sym: 'Rg', nameKz: 'Рентгений', nameRu: 'Рентгений', mass: '[282]', cat: 'transition' },
  { n: 112, sym: 'Cn', nameKz: 'Коперниций', nameRu: 'Коперниций', mass: '[285]', cat: 'transition' },
  { n: 113, sym: 'Nh', nameKz: 'Нихоний', nameRu: 'Нихоний', mass: '[286]', cat: 'post-transition' },
  { n: 114, sym: 'Fl', nameKz: 'Флеровий', nameRu: 'Флеровий', mass: '[289]', cat: 'post-transition' },
  { n: 115, sym: 'Mc', nameKz: 'Московий', nameRu: 'Московий', mass: '[290]', cat: 'post-transition' },
  { n: 116, sym: 'Lv', nameKz: 'Ливерморий', nameRu: 'Ливерморий', mass: '[293]', cat: 'post-transition' },
  { n: 117, sym: 'Ts', nameKz: 'Теннессин', nameRu: 'Теннессин', mass: '[294]', cat: 'halogen' },
  { n: 118, sym: 'Og', nameKz: 'Оганесон', nameRu: 'Оганесон', mass: '[294]', cat: 'noble' },
]

/** Returns 1-indexed (row, col) on an 18-col grid. Rows 1-7 for main table,
 *  rows 8-9 for the lanthanide/actinide strips placed below. */
export function gridPosition(n: number): { row: number; col: number } {
  if (n === 1) return { row: 1, col: 1 }
  if (n === 2) return { row: 1, col: 18 }
  if (n === 3) return { row: 2, col: 1 }
  if (n === 4) return { row: 2, col: 2 }
  if (n >= 5 && n <= 10) return { row: 2, col: 13 + (n - 5) }
  if (n === 11) return { row: 3, col: 1 }
  if (n === 12) return { row: 3, col: 2 }
  if (n >= 13 && n <= 18) return { row: 3, col: 13 + (n - 13) }
  if (n >= 19 && n <= 36) return { row: 4, col: n - 18 }
  if (n >= 37 && n <= 54) return { row: 5, col: n - 36 }
  if (n === 55) return { row: 6, col: 1 }
  if (n === 56) return { row: 6, col: 2 }
  if (n >= 57 && n <= 71) return { row: 8, col: 3 + (n - 57) }
  if (n >= 72 && n <= 86) return { row: 6, col: 4 + (n - 72) }
  if (n === 87) return { row: 7, col: 1 }
  if (n === 88) return { row: 7, col: 2 }
  if (n >= 89 && n <= 103) return { row: 9, col: 3 + (n - 89) }
  if (n >= 104 && n <= 118) return { row: 7, col: 4 + (n - 104) }
  return { row: 0, col: 0 }
}

export const CATEGORY_COLORS: Record<ElementCategory, string> = {
  alkali: 'bg-red-100 text-red-900 hover:bg-red-200',
  alkaline: 'bg-orange-100 text-orange-900 hover:bg-orange-200',
  transition: 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200',
  'post-transition': 'bg-lime-100 text-lime-900 hover:bg-lime-200',
  metalloid: 'bg-green-100 text-green-900 hover:bg-green-200',
  nonmetal: 'bg-teal-100 text-teal-900 hover:bg-teal-200',
  halogen: 'bg-cyan-100 text-cyan-900 hover:bg-cyan-200',
  noble: 'bg-sky-100 text-sky-900 hover:bg-sky-200',
  lanthanide: 'bg-purple-100 text-purple-900 hover:bg-purple-200',
  actinide: 'bg-pink-100 text-pink-900 hover:bg-pink-200',
}

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  alkali: 'Сілтілік металдар',
  alkaline: 'Сілтілік-жер металдары',
  transition: 'Өтпелі металдар',
  'post-transition': 'Постөтпелі металдар',
  metalloid: 'Металлоидтер',
  nonmetal: 'Бейметалдар',
  halogen: 'Галогендер',
  noble: 'Асыл газдар',
  lanthanide: 'Лантаноидтер',
  actinide: 'Актиноидтер',
}
