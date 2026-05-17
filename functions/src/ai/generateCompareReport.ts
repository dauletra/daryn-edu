import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, claudeApiKey } from "../firebaseAdmin";
import { checkRateLimit } from "./rateLimiter";

interface ParallelStat {
  classLevel: number;
  studentsTook: number;
  avgScore: number;
  passRate: number;
}

interface SubjectStat {
  subject: string;
  studentsTook: number;
  avgScore: number;
  passRate: number;
}

interface BankStat {
  id: string;
  name: string;
  quarter: number;
  academicYear: number;
  period: string;
  overall: {
    studentsTotal: number;
    studentsTook: number;
    avgScore: number;
    passRate: number;
  };
  byParallel: ParallelStat[];
  bySubject: SubjectStat[];
}

interface CompareReportPayload {
  banks: BankStat[];
  parallels: number[];
  subjects: string[];
  customInstructions?: string;
}

interface GenerateRequest {
  data: CompareReportPayload;
}

interface GenerateResponse {
  text: string;
}

const MAX_INSTRUCTIONS_LENGTH = 2000;

function validatePayload(data: unknown): asserts data is CompareReportPayload {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Деректер берілмеген");
  }
  const d = data as Partial<CompareReportPayload>;
  if (!Array.isArray(d.banks) || d.banks.length < 2) {
    throw new HttpsError(
      "invalid-argument",
      "Кемінде 2 тест банкі қажет"
    );
  }
  if (!Array.isArray(d.parallels) || !Array.isArray(d.subjects)) {
    throw new HttpsError("invalid-argument", "parallels/subjects қажет");
  }
  for (const b of d.banks) {
    if (
      !b ||
      typeof b.name !== "string" ||
      typeof b.quarter !== "number" ||
      typeof b.academicYear !== "number" ||
      !b.overall ||
      !Array.isArray(b.byParallel) ||
      !Array.isArray(b.bySubject)
    ) {
      throw new HttpsError("invalid-argument", "Банк деректері толық емес");
    }
  }
}

export const generateCompareReport = onCall(
  {
    secrets: [claudeApiKey],
    timeoutSeconds: 180,
    memory: "512MiB",
  },
  async (request): Promise<GenerateResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Авторизация қажет");
    }

    const uid = request.auth.uid;
    const userDoc = await db.collection("users").doc(uid).get();
    const role = userDoc.data()?.role;
    if (role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Анықтаманы тек әкімші жасай алады"
      );
    }

    const { data } = (request.data ?? {}) as GenerateRequest;
    validatePayload(data);

    const customInstructions = (data.customInstructions ?? "")
      .toString()
      .slice(0, MAX_INSTRUCTIONS_LENGTH)
      .trim();

    await checkRateLimit(uid);

    const apiKey = claudeApiKey.value();

    const payloadForModel = {
      banks: data.banks,
      parallels: data.parallels,
      subjects: data.subjects,
    };

    const banksList = data.banks
      .map(
        (b) =>
          `«${b.name}» (${b.quarter}-тоқсан, ${b.academicYear}–${b.academicYear + 1})`
      )
      .join("; ");

    const userPrompt = `# Деректер (JSON)

\`\`\`json
${JSON.stringify(payloadForModel, null, 2)}
\`\`\`

# Контекст

- Салыстырылатын тест банктары: ${banksList}.
- Барлық пайыздар 0–100 шкаласында.
- Бағалау шкаласы: ≥85% = 5, 65–84% = 4, 40–64% = 3, <40% = 2.
- Өту шегі (passRate): 40% және одан жоғары балл.
- \`banks\` массиві хронологиялық тәртіпте (ертерек банктер басында).
- Бұл — **салыстырмалы** анықтама: оқушылар тізімі жоқ, тек агрегацияланған статистика.

# Әкімшінің қосымша нұсқаулары

${customInstructions || "(жоқ — стандартты құрылым қолдан)"}

# Тапсырма

Жоғарыдағы деректер мен нұсқаулардың негізінде директор орынбасарының атынан салыстырмалы анықтама мәтінін жаз.`;

    const systemPrompt = `Сен — мектеп директорының оқу-тәрбие ісі жөніндегі орынбасарысың. Сенің міндетің — бірнеше тест банкі бойынша **салыстырмалы анықтама мәтінін** жазу. Анықтама статистиканы жай қайталау емес, **динамика мен айырмашылықтарды талдау** болады.

# Тіл және стиль

- Тек **қазақ тілінде** жаз.
- Стиль: ресми-іскерлік.
- Markdown белгілерін (\\*\\*, #, -, \\* тізім) **қолданба**. Тек қарапайым мәтін.
- Бөлім тақырыптарын осындай форматта жаз: «1. Жалпы динамика», «2. Параллельдер бойынша салыстыру» т.б.

# Сапа критерийлері (МАҢЫЗДЫ)

1. **Динамика және өзгеріс**. Тек сандарды атама — өзгерісті көрсет: «1-тоқсаннан 2-тоқсанға дейін орташа балл 68%-дан 74%-ға өсті — 6 балға өсу».
2. **Нақты салыстыру**. «9-сыныптар жақсы» жазба — «9-сыныптар 1-тоқсанда 71%, 2-тоқсанда 78% көрсетті — басқа параллельдердің ішіндегі ең тұрақты өсу».
3. **Себеп пен болжам**. Өзгерістің себебін болжап ұсын: «Химия пәніндегі тұрақты төмендеу (52% → 47% → 41%) пәннің күрделілігі емес, әдістемелік мәселе екенін көрсетеді».
4. **Тренд анықта**. Үш тоқсан болса — өсу/төмендеу/тұрақты деп көрсет.
5. **Деректерден тыс шықпа**. JSON-да жоқ сан, банк, пән — жазылмауы тиіс.
6. **Оқушы тізімі жоқ**. Бұл салыстырмалы анықтама — поименді тізім қажет емес.

# Стиль мысалы (бір абзац)

«Параллель бойынша орташа балл 1-тоқсанда 68%, 2-тоқсанда 73%, 3-тоқсанда 70% құрады — 2-тоқсанда айтарлықтай өсу байқалғанымен, 3-тоқсанда аздаған төмендеу тіркелді. Бұл өзгеріс химия (54% → 67% → 58%) және математика (62% → 72% → 64%) пәндеріндегі тербелістермен байланысты — екі пән бойынша да 3-тоқсанда күрделі тақырыптар енгізілген болуы мүмкін.»

# Мазмұн құрылымы

**Стандартты құрылым** (нұсқау өзгеше талап етпесе):

1. **Жалпы динамика** — банктер арасындағы орташа балл мен өту көрсеткішінің өзгерісі. Жалпы тренд (өсу/төмендеу/тұрақты).
2. **Параллельдер бойынша салыстыру** — әр параллельдің әр банктегі көрсеткіші. Қай параллель тұрақты, қайсысы құбылмалы.
3. **Пәндер бойынша салыстыру** — пәндердің динамикасы. Қай пәндер жақсарған, қайсысы нашарлаған, қайсысы тұрақты.
4. **Қорытынды және ұсыныстар** — деректерге негізделген 3–5 нақты әрекет.

**Әкімшінің нұсқауы бөлек құрылым талап етсе** — нұсқауға сай мәтін құр, бірақ сапа критерийлерін сақта.

# Деректер құрылымы (JSON-да не бар)

- \`banks\` — әр банк үшін: \`name\`, \`quarter\`, \`academicYear\`, \`overall\` (жалпы статистика), \`byParallel\` (параллельдер бойынша), \`bySubject\` (пәндер бойынша). Хронологиялық тәртіпте.
- \`parallels\` — кемінде бір банкте кездескен параллельдердің біріктірілген тізімі.
- \`subjects\` — кемінде бір банкте кездескен пәндердің біріктірілген тізімі.

# Шектеулер

- 600–1500 сөз аралығында (нұсқау өзгеше талап етпесе).
- Markdown тыйым салынған. Тек тегіс мәтін мен нөмірленген бөлімдер.
- Тек қазақ тілі.
- Поименді оқушы тізімі **жасама** — бұл деректер жоқ.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const msg =
        errorData?.error?.message ?? `Claude API қатесі: ${response.status}`;
      console.error("Claude API error:", msg);
      throw new HttpsError("internal", "Анықтаманы құру кезінде қате кетті");
    }

    const result = await response.json();
    const text = result?.content?.[0]?.text;
    if (typeof text !== "string" || !text.trim()) {
      throw new HttpsError("internal", "Бос жауап алынды");
    }

    return { text: text.trim() };
  }
);
