# План улучшений edu-core

**Дата составления:** 2026-04-27
**Все факты проверены чтением кода.**

## Контекст

Цель — подготовить кодовую базу к расширению функциональности (учителя, уроки, профили учеников, расписания), не ломая текущее. Сама архитектура и текущие фичи — в порядке. Никакой переделки ради «правильности».

## Что НЕ делать

| Идея | Почему отклонено |
|---|---|
| Custom Claims вместо `get(users/...)` в правилах | Уже сломали прод. Без Firebase emulator — слишком опасно |
| TanStack Query | 24 ручных `refetch()` — раздражает, но работает. Зависимость + миграция 14 страниц не оправданы |
| Sentry, Storybook, Playwright | Лишнее для проекта в текущем состоянии |
| Repository pattern, DI | Overengineering для 4-сервисной кодовой базы |
| Feature-based структура (`src/features/`) | Преждевременно — role-based для 3-4 ролей понятнее |
| Trogarь Security Rules без эмулятора | Любые правки — только после `firebase emulators:start` и ручной проверки |

---

## Шаги (порядок по полезности и низкому риску)

### Шаг 1. Удалить мёртвый код — 10 минут

`src/services/db.ts:552`:
```ts
export async function getAllResults(): Promise<TestResult[]> { ... }
```
Grep по проекту показал **0 вызовов** этой функции. Можно удалить.

**Риск:** нулевой.
**Когда:** сейчас, в любой момент.

---

### Шаг 2. Объединить `AdminLayout` + `ModeratorLayout` в `BaseLayout` — ~1 час

**Факты:**
- `AdminLayout.tsx`: 65 строк
- `ModeratorLayout.tsx`: 63 строки
- `diff` показал — отличаются **только** `roleLabel` и списком NavLink. Структура идентична на 90%.
- `StudentLayout.tsx` (63 строки) **отдельная** — содержит `TestingProvider` + блокировку навигации, **остаётся как есть**.

**Что сделать:**
```tsx
// src/components/layout/BaseLayout.tsx
interface NavItem { to: string; label: string }
interface Props { navItems: NavItem[]; roleLabel: string }
export function BaseLayout({ navItems, roleLabel }: Props) {
  // 50 строк JSX
}

// AdminLayout.tsx — становится 15 строк
const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Басты бет' },
  { to: '/admin/moderators', label: 'Модераторлар' },
  // ...
]
export function AdminLayout() {
  return <BaseLayout navItems={ADMIN_NAV} roleLabel="Әкімші" />
}
```

**Польза:** добавление 4-й роли (учитель, куратор, завуч) = 15 строк вместо 65 копипаста. Изменение шапки/sidebar = одно место.

**Риск:** низкий — UI рендерится одинаково, можно проверить визуально на admin и moderator.
**Когда:** перед началом работ по 4-й роли. Или сейчас, если будете трогать что-то в layouts.

---

### Шаг 3. Разбить `db.ts` по доменам — ~2-3 часа

**Факты:**
- 711 строк, 58 экспортируемых функций.
- Уже разделён комментариями (`// ---- Users ----` и т.д.).
- Самые крупные секции: Users (8 функций), Classes (8), Tests (8), Questions (7), Results (11).

**Что сделать:**
```
src/services/db/
  ├── index.ts        — re-export: export * from './users' и т.д.
  ├── users.ts        — ~165 строк
  ├── subjects.ts     — ~17 строк
  ├── classes.ts      — ~75 строк
  ├── testBanks.ts    — ~50 строк
  ├── tests.ts        — ~90 строк
  ├── questions.ts    — ~70 строк
  ├── results.ts      — ~95 строк
  ├── absences.ts     — ~25 строк
  └── functions.ts    — httpsCallable обёртки (~55 строк)
```

**Все импорты `import { getTests } from '@/services/db'` продолжают работать** через `index.ts`.

**Польза:** добавление новых доменов (lessons, teachers) = новый файл, не +200 строк в монолит. Файлы по 50-150 строк читаются мгновенно.

**Риск:** низкий — структура импортов остаётся прежней. Главное аккуратно перенести типы и helper'ы.

**Когда:** перед добавлением 1-2 новых доменов. Или **прямо сейчас** — это всё ещё выгодно даже без расширения, потому что улучшает навигацию.

---

### Шаг 4. Разбить `functions/src/index.ts` по доменам — ~1-2 часа

**Факты:**
- 813 строк, 6 экспортируемых функций + 5 helper'ов.
- Самая крупная — `startTest` (217 строк), за ней `generateQuestions` (152), `migrateResultsData` (100), `submitTest` (75).

**Что сделать:**
```
functions/src/
  ├── index.ts                    — только экспорты
  ├── tests/startTest.ts
  ├── tests/submitTest.ts
  ├── tests/grading.ts            — gradeAnswers + fisherYates
  ├── ai/generateQuestions.ts
  ├── ai/rateLimiter.ts
  ├── maintenance/migrateResultsData.ts
  ├── maintenance/cleanupOldResults.ts
  └── auth/onUserDeleted.ts
```

**Польза:** при cold start `submitTest` грузится ~150 строк своего модуля, не 813. Меньше CPU-секунд.
Для добавления новых функций (по урокам и т.д.) — отдельные файлы, не свалка.

**Риск:** низкий, но **нужен повторный деплой** функций.

**Когда:** вместе с шагом 3, если будете трогать data layer.

---

### Шаг 5. Разбить `App.tsx` — ~30 минут

**Факты:**
- 135 строк, **30 роутов** (3 публичных + 12 admin + 12 moderator + 3 student).
- Все 23 lazy-импорта в одном файле.

**Что сделать:**
```
src/routes/
  ├── adminRoutes.tsx       — массив роутов /admin/*
  ├── moderatorRoutes.tsx   — массив /moderator/*
  ├── studentRoutes.tsx     — массив /student/*
  └── publicRoutes.tsx      — /login, /open-test/:id, /

// App.tsx — становится 30-40 строк
const router = createBrowserRouter([
  { element: <Outlet />, errorElement: <RouteErrorBoundary />, children: [
    ...publicRoutes,
    { path: '/admin', element: ..., children: adminRoutes },
    { path: '/moderator', element: ..., children: moderatorRoutes },
    { path: '/student', element: ..., children: studentRoutes },
  ]},
])
```

**Польза:** добавление новых страниц по роли = правка одного маленького файла, не общего App.tsx. Добавление 4-й роли = 1 новый файл.

**Риск:** нулевой, чистая косметика.

**Когда:** когда добавите 4-ю роль или когда `App.tsx` станет реально мешать.

---

### Шаг 6. Большие страницы — разбивать **только когда будете трогать**

**Факты (топ страниц по строкам):**
| Файл | Строк |
|---|---|
| ClassDetailPage.tsx | 582 |
| TestTakingPage.tsx | 508 |
| AdminResultsPage.tsx | 467 |
| TestResultsPage.tsx | 354 |
| StudentsPage.tsx | 332 |

**Принцип:** **не трогать ради разбиения**. Когда будете править страницу для новой фичи — тогда вынести подкомпоненты по ходу. Иначе риск сломать рабочее без выгоды.

`AdminResultsPage` и `TestResultsPage` — ~70% дублируют логику. Если будете трогать одну — рассмотрите общий хук `useResultsTable()`. Не сейчас.

---

### Шаг 7. `AppUser` → discriminated union — **только при добавлении 4-й роли**

**Факты:**
- `.classId` используется в **20+ местах** (StudentsPage, ClassDetailPage, аналитика, exportClassResults и т.д.)
- `.disabled` — 5 мест (только ModeratorsPage + AuthContext)
- `.plainPassword` — 3 места (StudentsPage, ClassDetailPage)
- `.role` — 5+ мест

**Цена:** ~6-8 часов с правкой всех 20+ мест и ручным тестированием.

**Что сделать:**
```ts
type Admin = { uid: string; name: string; email: string; role: 'admin'; createdAt: Date }
type Moderator = Admin & { role: 'moderator'; disabled?: boolean }
type Student = Admin & { role: 'student'; classId?: string; plainPassword?: string }
type Teacher = Admin & { role: 'teacher'; subjectIds: string[]; classIds: string[] }
type AppUser = Admin | Moderator | Student | Teacher

// Helpers:
const isStudent = (u: AppUser): u is Student => u.role === 'student'
```

**Не нужно делать сейчас**, пока ролей 3 — типобезопасность не критична. Стоит делать **в момент добавления 4-й роли**, потому что после — каждая правка опциональных полей будет распространяться на все роли.

---

## Сводка по приоритетам

| # | Шаг | Время | Когда | Риск |
|---|---|---|---|---|
| 1 | Удалить `getAllResults()` | 10 мин | Сейчас | Нулевой |
| 2 | `BaseLayout` для admin/moderator | 1 ч | Сейчас или перед 4-й ролью | Низкий |
| 3 | Разбить `db.ts` по доменам | 2-3 ч | Перед добавлением новых доменов | Низкий |
| 4 | Разбить `functions/src/index.ts` | 1-2 ч | Вместе с шагом 3 | Низкий |
| 5 | Разбить `App.tsx` (роуты по файлам) | 30 мин | При добавлении 4-й роли | Нулевой |
| 6 | Разбивать большие страницы | По ходу правок | Не специально | — |
| 7 | `AppUser` discriminated union | 6-8 ч | Только при 4-й роли | Средний (типы) |

**Общий минимум, если хотите подготовить базу прямо сейчас:** шаги 1+2+3+4 ≈ **5-7 часов**.
**Минимум перед каждой новой ролью:** шаги 5+7 + при необходимости 2 ≈ **7-9 часов**.

---

## Что не входит в этот план (намеренно)

- Любые оптимизации Firebase reads/writes — текущий код **уже** использует фильтрацию на уровне Firestore (проверено в AdminAnalyticsPage и AdminResultsPage). Реальной экономии на копейках нет.
- Trogарь Security Rules — без emulator не безопасно.
- Тесты — пользователь явно сказал «не нужно большого покрытия». Ограничиться простой проверкой через UI после изменений.
