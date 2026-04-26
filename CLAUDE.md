# EduCore — инструкции для Claude

## Стек

- **React 19** + **TypeScript** + **Vite 7**
- **Firebase** (Firestore + Authentication + Cloud Functions)
- **Tailwind CSS 4**
- **React Router v7**
- **KaTeX** — рендеринг математических формул

## Команды

```bash
npm run dev               # локальный сервер
npm run build             # TypeScript + Vite build
npm run lint              # ESLint
npm run deploy            # build + firebase deploy (хостинг + functions + правила)
npm run deploy:hosting    # только хостинг
npm run deploy:functions  # только Cloud Functions
npm run deploy:rules      # только правила Firestore + индексы
```

## Архитектура

### Роли пользователей
- **admin** — управление модераторами, классами, банками тестов, аналитика
- **moderator** — создание и редактирование тестов, управление вопросами, просмотр результатов
- **student** — прохождение назначенных тестов

### Структура маршрутов
- `/` → LoginPage
- `/admin/*` → AdminLayout (только role=admin)
- `/moderator/*` → ModeratorLayout (только role=moderator)
- `/student/*` → StudentLayout (только role=student)
- `/open-test/:id` → OpenTestPage (публичный, без авторизации)

### Ключевые сервисы
- `src/services/firebase.ts` — инициализация Firebase
- `src/services/db.ts` — все операции с Firestore
- `src/services/auth.ts` — аутентификация
- `src/services/claude.ts` — генерация вопросов через Anthropic API (Claude)

### Контексты
- `AuthContext` — текущий пользователь, роль
- `BankContext` — выбранный тест-банк (для модератора)
- `ToastContext` — уведомления (showSuccess / showError)
- `TestingContext` — блокировка навигации во время прохождения теста

### Shared-компоненты
- `src/pages/shared/` — страницы, используемые несколькими ролями:
  - `ClassesListPage` — принимает `basePath`
  - `ClassDetailPage` — принимает `backTo`, `backLabel`
  - `StudentsPage`
  - `TestViewPage` — принимает `backTo`, `backLabel`

### UI-компоненты (`src/components/`)
- `ui/` — примитивы: `Button`, `Input`, `Modal`, `Badge`, `LoadingSpinner`, `MathText`
- `layout/` — `AdminLayout`, `ModeratorLayout`, `StudentLayout`, `ProtectedRoute`, `BankHeader`
- `feedback/` — `ErrorBoundary` (для ошибок в провайдерах), `RouteErrorBoundary` (для `errorElement` React Router; ловит ChunkLoadError после деплоя и автоматически делает один `window.location.reload()`)

### Hosting (firebase.json)
Ассеты с хешами в имени (js/css/woff/png/...) кешируются на год (`Cache-Control: immutable`). `index.html` отдаётся с `no-cache` — гарантирует, что новые деплои подхватываются клиентами сразу.

## Язык интерфейса

Весь UI **только на казахском языке**. Технические комментарии в коде можно оставлять на русском.

Ключевые термины:
| Термин | Казахский |
|--------|-----------|
| Тест | Тест |
| Банк тестов | Тест банкі |
| Вопрос | Сұрақ |
| Ответ | Жауап |
| Класс | Сынып |
| Ученик | Оқушы |
| Предмет | Пән |
| Четверть | Тоқсан |
| Результат | Нәтиже |
| Опубликован | Жарияланған |
| Черновик | Жоба |
| Сохранить | Сақтау |
| Отмена | Болдырмау |
| Удалить | Жою |
| Добавить | Қосу |
| Редактировать | Өңдеу |
| Создать | Жасау |
| Выйти | Шығу |

## Типы данных (src/types/index.ts)

- `ClassLevel` — `7 | 8 | 9 | 10 | 11`
- `LANGUAGES` — массив `{ value, label }` для выбора языка теста
- `Test`, `Question`, `TestResult`, `TestBank`, `Class`, `UserProfile`

## Паттерны

### Загрузка данных
Используется хук `useFirestoreQuery(() => dbFn(), [deps])` — возвращает `{ data, loading, error, refetch }`.

### Toast-уведомления
```ts
const { showSuccess, showError } = useToast()
showSuccess('Сақталды')
showError(err instanceof Error ? err.message : 'Қате')
```

### Валидация форм
`src/utils/validation.ts` — `validateField(value, [required, minLength(6)])`.

### Форматирование названий тестов
`src/utils/testTitle.ts` — `generateTestTitle({ subject, classLevel, variantNumber })` и `formatTestTitle(test)`.

### Математические формулы
Компонент `<MathText text={...} />` — автоматически рендерит LaTeX через KaTeX.

## Оценки (src/utils/scoreUtils.ts)

Пороги оценок вынесены в `scoreUtils.ts`. Не дублировать их в компонентах — всегда использовать `getScoreVariant(score)`.

## Firebase Blaze: бесплатный лимит

Проект **должен укладываться в бесплатные квоты Blaze**. Стоимость считается за каждую операцию, дешёвых ресурсов не бывает.

**Дневные лимиты Firestore (бесплатно):**
- 50 000 reads, 20 000 writes, 20 000 deletes
- 1 GiB storage, 10 GiB egress в месяц

**Месячные лимиты Cloud Functions (бесплатно):**
- 2M invocations, 400 000 GB-секунд, 200 000 CPU-секунд

**Что считается за read:**
- каждый документ в `getDocs` / `getDoc`
- каждое срабатывание `onSnapshot` listener
- **каждый `get(...)` в Security Rules** — критично

### Правила при изменении кода

1. **Не добавлять `onSnapshot` для редко меняющихся данных** (классы, предметы, банки тестов). Использовать `getDocs` + `useFirestoreQuery`.
2. **Не загружать всю коллекцию для аналитики на клиенте.** Если нужна агрегация — делать в Cloud Function через `getCountFromServer` или хранить готовые агрегаты.
3. **При запросах с фильтрами добавлять `limit()`** где уместно (таблицы с пагинацией).
4. **Не предлагать триггеры (`onWrite`/`onDocumentWritten`) на часто-меняющиеся коллекции** без явной выгоды — каждый триггер = invocation.
5. **Не трогать Firestore Security Rules без эмулятора.** Синтаксис `request.auth.token.foo != null` для отсутствующих полей ведёт себя непредсказуемо. Предложения по оптимизации правил (например, через custom claims) требуют проверки в `firebase emulators:start` перед деплоем — иначе можно случайно запретить доступ ко всем данным в проде.
6. **Денормализация — норма** для Firestore. `TestResult` намеренно хранит `classLevel`, `subject`, `testBankId` — чтобы избежать JOIN'ов и лишних reads.

Перед предложением «оптимизаций», экономящих <1000 reads/день, оценить риск против выгоды — обычно не стоит.
