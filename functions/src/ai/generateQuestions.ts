import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, claudeApiKey } from "../firebaseAdmin";
import { fixLatexEscapes, fixControlChars } from "./latexFix";
import { checkRateLimit } from "./rateLimiter";

const ALLOWED_COUNTS = [10, 20, 30] as const;
const ALLOWED_LANGUAGES = ["kz", "ru", "en"] as const;

const LANG_PROMPT_LABELS: Record<string, string> = {
  kz: "казахском",
  ru: "русском",
  en: "английском",
};

const MAX_TOKENS_BY_COUNT: Record<number, number> = {
  10: 4096,
  20: 8192,
  30: 12288,
};

interface GenerateRequest {
  topic: string;
  level: string;
  subject: string;
  count: number;
  language: string;
}

interface GeneratedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

export const generateQuestions = onCall(
  {
    secrets: [claudeApiKey],
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Необходима авторизация");
    }

    const uid = request.auth.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    const role = userDoc.data()?.role;
    if (role !== "moderator" && role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Только модераторы и администраторы могут генерировать вопросы"
      );
    }

    const { topic, level, subject, count, language } =
      request.data as GenerateRequest;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Укажите тему");
    }
    if (!subject || typeof subject !== "string") {
      throw new HttpsError("invalid-argument", "Укажите предмет");
    }
    if (!ALLOWED_COUNTS.includes(count as typeof ALLOWED_COUNTS[number])) {
      throw new HttpsError(
        "invalid-argument",
        `Количество вопросов должно быть: ${ALLOWED_COUNTS.join(", ")}`
      );
    }
    const lang = ALLOWED_LANGUAGES.includes(
      language as typeof ALLOWED_LANGUAGES[number]
    )
      ? language
      : "ru";
    const langLabel = LANG_PROMPT_LABELS[lang] ?? "русском";

    await checkRateLimit(uid);

    const apiKey = claudeApiKey.value();
    const levelStr = level?.trim() || "10 класс";
    const maxTokens = MAX_TOKENS_BY_COUNT[count] ?? 4096;

    const userPrompt = `Предмет: ${subject}
Тема: ${topic.trim()}
Уровень: ${levelStr}
Количество вопросов: ${count}`;

    const systemPrompt = `Ты — опытный педагог, составляющий качественные тестовые задания для школьников.

Сгенерируй ровно ${count} вопросов в виде JSON-массива. Только чистый JSON, без markdown-обёрток и пояснений.
Схема каждого элемента: { "text": "...", "options": ["...","...","...","...","..."], "correctIndex": 0 }

ЯЗЫК: все тексты (вопросы и варианты) — исключительно на ${langLabel} языке. Не смешивать языки.

СТРУКТУРА:
- Ровно 5 вариантов ответа (options), один правильный (correctIndex: 0–4)
- Дистракторы правдоподобны: схожи по типу и форме с правильным, но однозначно неверны
- Не использовать абсурдные или явно неправильные варианты вроде "Всё из перечисленного" без веской причины

КАЧЕСТВО ВОПРОСОВ:
- Разнообразие формулировок: не повторять одни и те же шаблоны ("Что такое...", "Какой из...")
- Проверяй понимание и применение знаний, а не механическое запоминание
- Сложность строго соответствует уровню учащихся
- Вопросы охватывают разные аспекты темы, не дублируют смысл друг друга
- Избегай вопросов с двусмысленными или спорными ответами

ФОРМУЛЫ (для точных наук):
- Инлайн: $формула$, блочные: $$формула$$
- Умножение: $\\\\cdot$ — НЕ × или \\\\times
- JSON-экранирование: двойной слэш внутри строк — "$\\\\frac{a}{b}$", а не "$\\frac{a}{b}$"`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const msg =
        errorData?.error?.message ?? `Ошибка Claude API: ${response.status}`;
      console.error("Claude API error:", msg);
      throw new HttpsError("internal", "Ошибка генерации вопросов");
    }

    const data = await response.json();
    const rawContent = data.content[0].text;

    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Raw AI response:", rawContent);
      throw new HttpsError(
        "internal",
        "Не удалось разобрать ответ AI, попробуйте ещё раз"
      );
    }

    const fixedJson = fixLatexEscapes(jsonMatch[0]);

    let questions: GeneratedQuestion[];
    try {
      questions = JSON.parse(fixedJson);
    } catch {
      console.error("Raw AI response:", rawContent);
      console.error("Fixed JSON attempt:", fixedJson);
      throw new HttpsError(
        "internal",
        "Не удалось разобрать ответ AI, попробуйте ещё раз"
      );
    }

    for (const q of questions) {
      if (
        !q.text ||
        !Array.isArray(q.options) ||
        q.options.length !== 5 ||
        typeof q.correctIndex !== "number" ||
        q.correctIndex < 0 ||
        q.correctIndex > 4
      ) {
        throw new HttpsError("internal", "Некорректный формат вопроса от AI");
      }
    }

    for (const q of questions) {
      q.text = fixControlChars(q.text);
      q.options = q.options.map(fixControlChars);
    }

    return { questions };
  }
);
