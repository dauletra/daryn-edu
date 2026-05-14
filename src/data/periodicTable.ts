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
  /** Common oxidation states used at school level (sorted ascending).
   *  Empty / omitted for noble gases and superheavies that don't form compounds in school problems. */
  ox?: number[]
  /** Ground-state electron configuration (noble-gas core notation for periods ≥4).
   *  Optional for superheavies where it is theoretical. */
  config?: string
}

/** Russian-cognate Kazakh names. Where Kazakh has an established native term
 *  (Сутегі, Көміртек, Оттек, Күкірт, Темір, Мыс, Күміс, Алтын, Сынап, Қорғасын),
 *  it is preferred over the Russian transliteration. */
export const ELEMENTS: readonly PeriodicElement[] = [
  { n: 1, sym: 'H', nameKz: 'Сутегі', nameRu: 'Водород', mass: 1.008, cat: 'nonmetal', ox: [-1, +1], config: '1s¹' },
  { n: 2, sym: 'He', nameKz: 'Гелий', nameRu: 'Гелий', mass: 4.003, cat: 'noble', config: '1s²' },
  { n: 3, sym: 'Li', nameKz: 'Литий', nameRu: 'Литий', mass: 6.94, cat: 'alkali', ox: [+1], config: '1s² 2s¹' },
  { n: 4, sym: 'Be', nameKz: 'Бериллий', nameRu: 'Бериллий', mass: 9.012, cat: 'alkaline', ox: [+2], config: '1s² 2s²' },
  { n: 5, sym: 'B', nameKz: 'Бор', nameRu: 'Бор', mass: 10.81, cat: 'metalloid', ox: [+3], config: '1s² 2s² 2p¹' },
  { n: 6, sym: 'C', nameKz: 'Көміртегі', nameRu: 'Углерод', mass: 12.011, cat: 'nonmetal', ox: [-4, +2, +4], config: '1s² 2s² 2p²' },
  { n: 7, sym: 'N', nameKz: 'Азот', nameRu: 'Азот', mass: 14.007, cat: 'nonmetal', ox: [-3, +1, +2, +3, +4, +5], config: '1s² 2s² 2p³' },
  { n: 8, sym: 'O', nameKz: 'Оттегі', nameRu: 'Кислород', mass: 15.999, cat: 'nonmetal', ox: [-2, -1, +2], config: '1s² 2s² 2p⁴' },
  { n: 9, sym: 'F', nameKz: 'Фтор', nameRu: 'Фтор', mass: 18.998, cat: 'halogen', ox: [-1], config: '1s² 2s² 2p⁵' },
  { n: 10, sym: 'Ne', nameKz: 'Неон', nameRu: 'Неон', mass: 20.180, cat: 'noble', config: '1s² 2s² 2p⁶' },
  { n: 11, sym: 'Na', nameKz: 'Натрий', nameRu: 'Натрий', mass: 22.990, cat: 'alkali', ox: [+1], config: '[Ne] 3s¹' },
  { n: 12, sym: 'Mg', nameKz: 'Магний', nameRu: 'Магний', mass: 24.305, cat: 'alkaline', ox: [+2], config: '[Ne] 3s²' },
  { n: 13, sym: 'Al', nameKz: 'Алюминий', nameRu: 'Алюминий', mass: 26.982, cat: 'post-transition', ox: [+3], config: '[Ne] 3s² 3p¹' },
  { n: 14, sym: 'Si', nameKz: 'Кремний', nameRu: 'Кремний', mass: 28.085, cat: 'metalloid', ox: [-4, +4], config: '[Ne] 3s² 3p²' },
  { n: 15, sym: 'P', nameKz: 'Фосфор', nameRu: 'Фосфор', mass: 30.974, cat: 'nonmetal', ox: [-3, +3, +5], config: '[Ne] 3s² 3p³' },
  { n: 16, sym: 'S', nameKz: 'Күкірт', nameRu: 'Сера', mass: 32.06, cat: 'nonmetal', ox: [-2, +4, +6], config: '[Ne] 3s² 3p⁴' },
  { n: 17, sym: 'Cl', nameKz: 'Хлор', nameRu: 'Хлор', mass: 35.45, cat: 'halogen', ox: [-1, +1, +3, +5, +7], config: '[Ne] 3s² 3p⁵' },
  { n: 18, sym: 'Ar', nameKz: 'Аргон', nameRu: 'Аргон', mass: 39.948, cat: 'noble', config: '[Ne] 3s² 3p⁶' },
  { n: 19, sym: 'K', nameKz: 'Калий', nameRu: 'Калий', mass: 39.098, cat: 'alkali', ox: [+1], config: '[Ar] 4s¹' },
  { n: 20, sym: 'Ca', nameKz: 'Кальций', nameRu: 'Кальций', mass: 40.078, cat: 'alkaline', ox: [+2], config: '[Ar] 4s²' },
  { n: 21, sym: 'Sc', nameKz: 'Скандий', nameRu: 'Скандий', mass: 44.956, cat: 'transition', ox: [+3], config: '[Ar] 3d¹ 4s²' },
  { n: 22, sym: 'Ti', nameKz: 'Титан', nameRu: 'Титан', mass: 47.867, cat: 'transition', ox: [+2, +3, +4], config: '[Ar] 3d² 4s²' },
  { n: 23, sym: 'V', nameKz: 'Ванадий', nameRu: 'Ванадий', mass: 50.942, cat: 'transition', ox: [+2, +3, +4, +5], config: '[Ar] 3d³ 4s²' },
  { n: 24, sym: 'Cr', nameKz: 'Хром', nameRu: 'Хром', mass: 51.996, cat: 'transition', ox: [+2, +3, +6], config: '[Ar] 3d⁵ 4s¹' },
  { n: 25, sym: 'Mn', nameKz: 'Марганец', nameRu: 'Марганец', mass: 54.938, cat: 'transition', ox: [+2, +4, +6, +7], config: '[Ar] 3d⁵ 4s²' },
  { n: 26, sym: 'Fe', nameKz: 'Темір', nameRu: 'Железо', mass: 55.845, cat: 'transition', ox: [+2, +3], config: '[Ar] 3d⁶ 4s²' },
  { n: 27, sym: 'Co', nameKz: 'Кобальт', nameRu: 'Кобальт', mass: 58.933, cat: 'transition', ox: [+2, +3], config: '[Ar] 3d⁷ 4s²' },
  { n: 28, sym: 'Ni', nameKz: 'Никель', nameRu: 'Никель', mass: 58.693, cat: 'transition', ox: [+2, +3], config: '[Ar] 3d⁸ 4s²' },
  { n: 29, sym: 'Cu', nameKz: 'Мыс', nameRu: 'Медь', mass: 63.546, cat: 'transition', ox: [+1, +2], config: '[Ar] 3d¹⁰ 4s¹' },
  { n: 30, sym: 'Zn', nameKz: 'Мырыш', nameRu: 'Цинк', mass: 65.38, cat: 'transition', ox: [+2], config: '[Ar] 3d¹⁰ 4s²' },
  { n: 31, sym: 'Ga', nameKz: 'Галлий', nameRu: 'Галлий', mass: 69.723, cat: 'post-transition', ox: [+3], config: '[Ar] 3d¹⁰ 4s² 4p¹' },
  { n: 32, sym: 'Ge', nameKz: 'Германий', nameRu: 'Германий', mass: 72.630, cat: 'metalloid', ox: [+2, +4], config: '[Ar] 3d¹⁰ 4s² 4p²' },
  { n: 33, sym: 'As', nameKz: 'Мышьяк', nameRu: 'Мышьяк', mass: 74.922, cat: 'metalloid', ox: [-3, +3, +5], config: '[Ar] 3d¹⁰ 4s² 4p³' },
  { n: 34, sym: 'Se', nameKz: 'Селен', nameRu: 'Селен', mass: 78.971, cat: 'nonmetal', ox: [-2, +4, +6], config: '[Ar] 3d¹⁰ 4s² 4p⁴' },
  { n: 35, sym: 'Br', nameKz: 'Бром', nameRu: 'Бром', mass: 79.904, cat: 'halogen', ox: [-1, +1, +3, +5, +7], config: '[Ar] 3d¹⁰ 4s² 4p⁵' },
  { n: 36, sym: 'Kr', nameKz: 'Криптон', nameRu: 'Криптон', mass: 83.798, cat: 'noble', config: '[Ar] 3d¹⁰ 4s² 4p⁶' },
  { n: 37, sym: 'Rb', nameKz: 'Рубидий', nameRu: 'Рубидий', mass: 85.468, cat: 'alkali', ox: [+1], config: '[Kr] 5s¹' },
  { n: 38, sym: 'Sr', nameKz: 'Стронций', nameRu: 'Стронций', mass: 87.62, cat: 'alkaline', ox: [+2], config: '[Kr] 5s²' },
  { n: 39, sym: 'Y', nameKz: 'Иттрий', nameRu: 'Иттрий', mass: 88.906, cat: 'transition', ox: [+3], config: '[Kr] 4d¹ 5s²' },
  { n: 40, sym: 'Zr', nameKz: 'Цирконий', nameRu: 'Цирконий', mass: 91.224, cat: 'transition', ox: [+4], config: '[Kr] 4d² 5s²' },
  { n: 41, sym: 'Nb', nameKz: 'Ниобий', nameRu: 'Ниобий', mass: 92.906, cat: 'transition', ox: [+3, +5], config: '[Kr] 4d⁴ 5s¹' },
  { n: 42, sym: 'Mo', nameKz: 'Молибден', nameRu: 'Молибден', mass: 95.95, cat: 'transition', ox: [+3, +4, +6], config: '[Kr] 4d⁵ 5s¹' },
  { n: 43, sym: 'Tc', nameKz: 'Технеций', nameRu: 'Технеций', mass: '[98]', cat: 'transition', ox: [+4, +6, +7], config: '[Kr] 4d⁵ 5s²' },
  { n: 44, sym: 'Ru', nameKz: 'Рутений', nameRu: 'Рутений', mass: 101.07, cat: 'transition', ox: [+3, +4, +6, +8], config: '[Kr] 4d⁷ 5s¹' },
  { n: 45, sym: 'Rh', nameKz: 'Родий', nameRu: 'Родий', mass: 102.906, cat: 'transition', ox: [+1, +3], config: '[Kr] 4d⁸ 5s¹' },
  { n: 46, sym: 'Pd', nameKz: 'Палладий', nameRu: 'Палладий', mass: 106.42, cat: 'transition', ox: [+2, +4], config: '[Kr] 4d¹⁰' },
  { n: 47, sym: 'Ag', nameKz: 'Күміс', nameRu: 'Серебро', mass: 107.868, cat: 'transition', ox: [+1], config: '[Kr] 4d¹⁰ 5s¹' },
  { n: 48, sym: 'Cd', nameKz: 'Кадмий', nameRu: 'Кадмий', mass: 112.414, cat: 'transition', ox: [+2], config: '[Kr] 4d¹⁰ 5s²' },
  { n: 49, sym: 'In', nameKz: 'Индий', nameRu: 'Индий', mass: 114.818, cat: 'post-transition', ox: [+1, +3], config: '[Kr] 4d¹⁰ 5s² 5p¹' },
  { n: 50, sym: 'Sn', nameKz: 'Қалайы', nameRu: 'Олово', mass: 118.710, cat: 'post-transition', ox: [+2, +4], config: '[Kr] 4d¹⁰ 5s² 5p²' },
  { n: 51, sym: 'Sb', nameKz: 'Сурьма', nameRu: 'Сурьма', mass: 121.760, cat: 'metalloid', ox: [-3, +3, +5], config: '[Kr] 4d¹⁰ 5s² 5p³' },
  { n: 52, sym: 'Te', nameKz: 'Теллур', nameRu: 'Теллур', mass: 127.60, cat: 'metalloid', ox: [-2, +4, +6], config: '[Kr] 4d¹⁰ 5s² 5p⁴' },
  { n: 53, sym: 'I', nameKz: 'Иод', nameRu: 'Иод', mass: 126.904, cat: 'halogen', ox: [-1, +1, +3, +5, +7], config: '[Kr] 4d¹⁰ 5s² 5p⁵' },
  { n: 54, sym: 'Xe', nameKz: 'Ксенон', nameRu: 'Ксенон', mass: 131.293, cat: 'noble', ox: [+2, +4, +6, +8], config: '[Kr] 4d¹⁰ 5s² 5p⁶' },
  { n: 55, sym: 'Cs', nameKz: 'Цезий', nameRu: 'Цезий', mass: 132.905, cat: 'alkali', ox: [+1], config: '[Xe] 6s¹' },
  { n: 56, sym: 'Ba', nameKz: 'Барий', nameRu: 'Барий', mass: 137.327, cat: 'alkaline', ox: [+2], config: '[Xe] 6s²' },
  { n: 57, sym: 'La', nameKz: 'Лантан', nameRu: 'Лантан', mass: 138.905, cat: 'lanthanide', ox: [+3], config: '[Xe] 5d¹ 6s²' },
  { n: 58, sym: 'Ce', nameKz: 'Церий', nameRu: 'Церий', mass: 140.116, cat: 'lanthanide', ox: [+3, +4], config: '[Xe] 4f¹ 5d¹ 6s²' },
  { n: 59, sym: 'Pr', nameKz: 'Празеодим', nameRu: 'Празеодим', mass: 140.908, cat: 'lanthanide', ox: [+3], config: '[Xe] 4f³ 6s²' },
  { n: 60, sym: 'Nd', nameKz: 'Неодим', nameRu: 'Неодим', mass: 144.242, cat: 'lanthanide', ox: [+3], config: '[Xe] 4f⁴ 6s²' },
  { n: 61, sym: 'Pm', nameKz: 'Прометий', nameRu: 'Прометий', mass: '[145]', cat: 'lanthanide', ox: [+3], config: '[Xe] 4f⁵ 6s²' },
  { n: 62, sym: 'Sm', nameKz: 'Самарий', nameRu: 'Самарий', mass: 150.36, cat: 'lanthanide', ox: [+2, +3], config: '[Xe] 4f⁶ 6s²' },
  { n: 63, sym: 'Eu', nameKz: 'Европий', nameRu: 'Европий', mass: 151.964, cat: 'lanthanide', ox: [+2, +3], config: '[Xe] 4f⁷ 6s²' },
  { n: 64, sym: 'Gd', nameKz: 'Гадолиний', nameRu: 'Гадолиний', mass: 157.25, cat: 'lanthanide', ox: [+3], config: '[Xe] 4f⁷ 5d¹ 6s²' },
  { n: 65, sym: 'Tb', nameKz: 'Тербий', nameRu: 'Тербий', mass: 158.925, cat: 'lanthanide', ox: [+3], config: '[Xe] 4f⁹ 6s²' },
  { n: 66, sym: 'Dy', nameKz: 'Диспрозий', nameRu: 'Диспрозий', mass: 162.500, cat: 'lanthanide', ox: [+3], config: '[Xe] 4f¹⁰ 6s²' },
  { n: 67, sym: 'Ho', nameKz: 'Гольмий', nameRu: 'Гольмий', mass: 164.930, cat: 'lanthanide', ox: [+3], config: '[Xe] 4f¹¹ 6s²' },
  { n: 68, sym: 'Er', nameKz: 'Эрбий', nameRu: 'Эрбий', mass: 167.259, cat: 'lanthanide', ox: [+3], config: '[Xe] 4f¹² 6s²' },
  { n: 69, sym: 'Tm', nameKz: 'Тулий', nameRu: 'Тулий', mass: 168.934, cat: 'lanthanide', ox: [+3], config: '[Xe] 4f¹³ 6s²' },
  { n: 70, sym: 'Yb', nameKz: 'Иттербий', nameRu: 'Иттербий', mass: 173.045, cat: 'lanthanide', ox: [+2, +3], config: '[Xe] 4f¹⁴ 6s²' },
  { n: 71, sym: 'Lu', nameKz: 'Лютеций', nameRu: 'Лютеций', mass: 174.967, cat: 'lanthanide', ox: [+3], config: '[Xe] 4f¹⁴ 5d¹ 6s²' },
  { n: 72, sym: 'Hf', nameKz: 'Гафний', nameRu: 'Гафний', mass: 178.49, cat: 'transition', ox: [+4], config: '[Xe] 4f¹⁴ 5d² 6s²' },
  { n: 73, sym: 'Ta', nameKz: 'Тантал', nameRu: 'Тантал', mass: 180.948, cat: 'transition', ox: [+5], config: '[Xe] 4f¹⁴ 5d³ 6s²' },
  { n: 74, sym: 'W', nameKz: 'Вольфрам', nameRu: 'Вольфрам', mass: 183.84, cat: 'transition', ox: [+4, +6], config: '[Xe] 4f¹⁴ 5d⁴ 6s²' },
  { n: 75, sym: 'Re', nameKz: 'Рений', nameRu: 'Рений', mass: 186.207, cat: 'transition', ox: [+4, +7], config: '[Xe] 4f¹⁴ 5d⁵ 6s²' },
  { n: 76, sym: 'Os', nameKz: 'Осмий', nameRu: 'Осмий', mass: 190.23, cat: 'transition', ox: [+4, +6, +8], config: '[Xe] 4f¹⁴ 5d⁶ 6s²' },
  { n: 77, sym: 'Ir', nameKz: 'Иридий', nameRu: 'Иридий', mass: 192.217, cat: 'transition', ox: [+3, +4], config: '[Xe] 4f¹⁴ 5d⁷ 6s²' },
  { n: 78, sym: 'Pt', nameKz: 'Платина', nameRu: 'Платина', mass: 195.084, cat: 'transition', ox: [+2, +4], config: '[Xe] 4f¹⁴ 5d⁹ 6s¹' },
  { n: 79, sym: 'Au', nameKz: 'Алтын', nameRu: 'Золото', mass: 196.967, cat: 'transition', ox: [+1, +3], config: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹' },
  { n: 80, sym: 'Hg', nameKz: 'Сынап', nameRu: 'Ртуть', mass: 200.592, cat: 'transition', ox: [+1, +2], config: '[Xe] 4f¹⁴ 5d¹⁰ 6s²' },
  { n: 81, sym: 'Tl', nameKz: 'Таллий', nameRu: 'Таллий', mass: 204.38, cat: 'post-transition', ox: [+1, +3], config: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹' },
  { n: 82, sym: 'Pb', nameKz: 'Қорғасын', nameRu: 'Свинец', mass: 207.2, cat: 'post-transition', ox: [+2, +4], config: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²' },
  { n: 83, sym: 'Bi', nameKz: 'Висмут', nameRu: 'Висмут', mass: 208.980, cat: 'post-transition', ox: [+3, +5], config: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³' },
  { n: 84, sym: 'Po', nameKz: 'Полоний', nameRu: 'Полоний', mass: '[209]', cat: 'post-transition', ox: [+2, +4], config: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴' },
  { n: 85, sym: 'At', nameKz: 'Астат', nameRu: 'Астат', mass: '[210]', cat: 'halogen', ox: [-1, +1, +5, +7], config: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵' },
  { n: 86, sym: 'Rn', nameKz: 'Радон', nameRu: 'Радон', mass: '[222]', cat: 'noble', config: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶' },
  { n: 87, sym: 'Fr', nameKz: 'Франций', nameRu: 'Франций', mass: '[223]', cat: 'alkali', ox: [+1], config: '[Rn] 7s¹' },
  { n: 88, sym: 'Ra', nameKz: 'Радий', nameRu: 'Радий', mass: '[226]', cat: 'alkaline', ox: [+2], config: '[Rn] 7s²' },
  { n: 89, sym: 'Ac', nameKz: 'Актиний', nameRu: 'Актиний', mass: '[227]', cat: 'actinide', ox: [+3], config: '[Rn] 6d¹ 7s²' },
  { n: 90, sym: 'Th', nameKz: 'Торий', nameRu: 'Торий', mass: 232.038, cat: 'actinide', ox: [+4], config: '[Rn] 6d² 7s²' },
  { n: 91, sym: 'Pa', nameKz: 'Протактиний', nameRu: 'Протактиний', mass: 231.036, cat: 'actinide', ox: [+4, +5], config: '[Rn] 5f² 6d¹ 7s²' },
  { n: 92, sym: 'U', nameKz: 'Уран', nameRu: 'Уран', mass: 238.029, cat: 'actinide', ox: [+3, +4, +5, +6], config: '[Rn] 5f³ 6d¹ 7s²' },
  { n: 93, sym: 'Np', nameKz: 'Нептуний', nameRu: 'Нептуний', mass: '[237]', cat: 'actinide', ox: [+3, +4, +5, +6, +7], config: '[Rn] 5f⁴ 6d¹ 7s²' },
  { n: 94, sym: 'Pu', nameKz: 'Плутоний', nameRu: 'Плутоний', mass: '[244]', cat: 'actinide', ox: [+3, +4, +5, +6], config: '[Rn] 5f⁶ 7s²' },
  { n: 95, sym: 'Am', nameKz: 'Америций', nameRu: 'Америций', mass: '[243]', cat: 'actinide', ox: [+3, +4, +5, +6], config: '[Rn] 5f⁷ 7s²' },
  { n: 96, sym: 'Cm', nameKz: 'Кюрий', nameRu: 'Кюрий', mass: '[247]', cat: 'actinide', ox: [+3], config: '[Rn] 5f⁷ 6d¹ 7s²' },
  { n: 97, sym: 'Bk', nameKz: 'Берклий', nameRu: 'Берклий', mass: '[247]', cat: 'actinide', ox: [+3, +4], config: '[Rn] 5f⁹ 7s²' },
  { n: 98, sym: 'Cf', nameKz: 'Калифорний', nameRu: 'Калифорний', mass: '[251]', cat: 'actinide', ox: [+3], config: '[Rn] 5f¹⁰ 7s²' },
  { n: 99, sym: 'Es', nameKz: 'Эйнштейний', nameRu: 'Эйнштейний', mass: '[252]', cat: 'actinide', ox: [+3], config: '[Rn] 5f¹¹ 7s²' },
  { n: 100, sym: 'Fm', nameKz: 'Фермий', nameRu: 'Фермий', mass: '[257]', cat: 'actinide', ox: [+3], config: '[Rn] 5f¹² 7s²' },
  { n: 101, sym: 'Md', nameKz: 'Менделевий', nameRu: 'Менделевий', mass: '[258]', cat: 'actinide', ox: [+3], config: '[Rn] 5f¹³ 7s²' },
  { n: 102, sym: 'No', nameKz: 'Нобелий', nameRu: 'Нобелий', mass: '[259]', cat: 'actinide', ox: [+2, +3], config: '[Rn] 5f¹⁴ 7s²' },
  { n: 103, sym: 'Lr', nameKz: 'Лоуренсий', nameRu: 'Лоуренсий', mass: '[266]', cat: 'actinide', ox: [+3], config: '[Rn] 5f¹⁴ 7s² 7p¹' },
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

/** Period (1–7) — derived from atomic number. Lanthanides count as period 6, actinides as period 7. */
export function getPeriod(n: number): number {
  if (n <= 2) return 1
  if (n <= 10) return 2
  if (n <= 18) return 3
  if (n <= 36) return 4
  if (n <= 54) return 5
  if (n <= 86) return 6
  return 7
}

/** Soviet/Kazakh school group notation: "I A", "VIII B", "Лантаноидтер", etc.
 *  Uses the long-form periodic table column to derive A/B subgroup. */
export function getGroupLabel(n: number): string {
  // Lanthanides & actinides have no standard A/B group — both belong to III B family
  if (n >= 57 && n <= 71) return 'III B (лантаноидтер)'
  if (n >= 89 && n <= 103) return 'III B (актиноидтер)'

  const { col } = gridPosition(n)
  switch (col) {
    case 1: return 'I A'
    case 2: return 'II A'
    case 3: return 'III B'
    case 4: return 'IV B'
    case 5: return 'V B'
    case 6: return 'VI B'
    case 7: return 'VII B'
    case 8:
    case 9:
    case 10: return 'VIII B'
    case 11: return 'I B'
    case 12: return 'II B'
    case 13: return 'III A'
    case 14: return 'IV A'
    case 15: return 'V A'
    case 16: return 'VI A'
    case 17: return 'VII A'
    case 18: return 'VIII A'
    default: return '—'
  }
}

/** Pretty-print oxidation state: +2, −1, etc. */
export function formatOx(ox: number): string {
  if (ox === 0) return '0'
  return ox > 0 ? `+${ox}` : `−${Math.abs(ox)}`
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
