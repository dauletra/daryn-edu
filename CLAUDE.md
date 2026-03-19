# EduCore — инструкции для Claude

## Стек

- **React 19** + **TypeScript** + **Vite 7**
- **Firebase** (Firestore + Authentication + Cloud Functions)
- **Tailwind CSS 4**
- **React Router v7**
- **KaTeX** — рендеринг математических формул

## Команды

```bash
npm run dev          # локальный сервер
npm run build        # TypeScript + Vite build
npm run lint         # ESLint
npm run deploy       # build + firebase deploy (хостинг + functions)
npm run deploy:hosting  # только хостинг
npm run deploy:rules    # только правила Firestore
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
