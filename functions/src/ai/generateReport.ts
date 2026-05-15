import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, claudeApiKey } from "../firebaseAdmin";
import { checkRateLimit } from "./rateLimiter";

interface ClassStat {
  className: string;
  studentsTotal: number;
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

interface ClassSubjectCell {
  className: string;
  subject: string;
  avgScore: number;
  studentsTook: number;
}

interface StudentStat {
  name: string;
  className: string;
  avgScore: number;
  attempts: number;
  subjects: Array<{ subject: string; score: number }>;
}

interface ReportPayload {
  scope: "parallel" | "bank";
  bankTitle: string;
  classLevel?: number;
  period: string;
  overall: {
    studentsTotal: number;
    studentsTook: number;
    avgScore: number;
    passRate: number;
    gradeDistribution: { grade5: number; grade4: number; grade3: number; grade2: number };
  };
  byClass: ClassStat[];
  bySubject: SubjectStat[];
  byClassSubject: ClassSubjectCell[];
  byStudent: StudentStat[];
  customInstructions?: string;
}

interface GenerateReportRequest {
  data: ReportPayload;
}

interface GenerateReportResponse {
  text: string;
}

const MAX_INSTRUCTIONS_LENGTH = 2000;

function validatePayload(data: unknown): asserts data is ReportPayload {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Деректер берілмеген");
  }
  const d = data as Partial<ReportPayload>;
  if (d.scope !== "parallel" && d.scope !== "bank") {
    throw new HttpsError("invalid-argument", "scope қате");
  }
  if (typeof d.bankTitle !== "string" || !d.bankTitle) {
    throw new HttpsError("invalid-argument", "bankTitle қажет");
  }
  if (d.scope === "parallel" && typeof d.classLevel !== "number") {
    throw new HttpsError("invalid-argument", "classLevel қажет");
  }
  if (
    !d.overall ||
    !Array.isArray(d.byClass) ||
    !Array.isArray(d.bySubject) ||
    !Array.isArray(d.byClassSubject) ||
    !Array.isArray(d.byStudent)
  ) {
    throw new HttpsError("invalid-argument", "Агрегациялық деректер толық емес");
  }
}

export const generateReport = onCall(
  {
    secrets: [claudeApiKey],
    timeoutSeconds: 180,
    memory: "512MiB",
  },
  async (request): Promise<GenerateReportResponse> => {
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

    const { data } = (request.data ?? {}) as GenerateReportRequest;
    validatePayload(data);

    const customInstructions = (data.customInstructions ?? "")
      .toString()
      .slice(0, MAX_INSTRUCTIONS_LENGTH)
      .trim();

    await checkRateLimit(uid);

    const apiKey = claudeApiKey.value();

    const scopeLabel =
      data.scope === "parallel"
        ? `${data.classLevel}-сыныптар параллелі`
        : "тест банкі бойынша барлық параллельдер (7–11 сыныптар)";

    const payloadForModel = {
      scope: data.scope,
      bankTitle: data.bankTitle,
      classLevel: data.classLevel,
      period: data.period,
      overall: data.overall,
      byClass: data.byClass,
      bySubject: data.bySubject,
      byClassSubject: data.byClassSubject,
      byStudent: data.byStudent,
    };

    const userPrompt = `# Деректер (JSON)

\`\`\`json
${JSON.stringify(payloadForModel, null, 2)}
\`\`\`

# Контекст

- Қамту: ${scopeLabel}.
- Тест банкі: «${data.bankTitle}», кезең: ${data.period}.
- Барлық пайыздар 0–100 шкаласында.
- Бағалау шкаласы: ≥85% = 5, 65–84% = 4, 40–64% = 3, <40% = 2.
- Өту шегі (passRate): 40% және одан жоғары балл.
- byStudent массивінде оқушылар орташа балл бойынша өсу ретімен берілген (ең әлсіздер басында).

# Әкімшінің қосымша нұсқаулары

${customInstructions || "(жоқ — стандартты құрылым қолдан)"}

# Тапсырма

Жоғарыдағы деректер мен нұсқаулардың негізінде директор орынбасарының атынан анықтама мәтінін жаз.`;

    const systemPrompt = `Сен — мектеп директорының оқу-тәрбие ісі жөніндегі орынбасарысың. Сенің міндетің — директорға арналған **ресми анықтама мәтінін** жазу. Анықтама тест нәтижелерін **талдау** болады, статистиканы жай қайталау емес.

# Тіл және стиль

- Тек **қазақ тілінде** жаз. Орыс, ағылшын немесе басқа тілді араластырма.
- Стиль: ресми-іскерлік.
- Markdown белгілерін (\\*\\*, #, -, \\* тізім) **қолданба**. Тек қарапайым мәтін.
- Бөлім тақырыптарын осындай форматта жаз: «1. Жалпы көрсеткіштер», «2. Сыныптар бойынша талдау» т.б. Жолдың басында, бөлек жолда.

# Сапа критерийлері (МАҢЫЗДЫ)

Әр сөйлем мынадай талаптарға сай болуы керек:

1. Мәтінді жиналыста оқуға болатындай түсінікті болсын.
2. **Нақты атау**. Бағамыз, оқушымыз, сыныбымыз бар болса — атап өт. «Ең төмен балл алған сыныптар» жазба — «Ең төмен балл 7Б сыныбында (52%) тіркелді» деп жаз.
3. **Салыстыру және контраст**. Сандарды бөлек көрсетпей, контекспен бер: «9А сыныбы (84%) бойынша 9В сыныбынан (61%) 23 балл артық».
4. **Себеп пен салдар**. Тек сандарды атама — нені білдіретінін айт: «Химия пәніндегі төмен көрсеткіш (45%) пәннің күрделілігін емес, түсіндіру әдістемесін қайта қарауды қажет ететіндігін көрсетеді».
5. Сипаттамалар нақты болу керек.
6. **Деректерден тыс шықпа**. JSON-да жоқ оқушы, сынып, пән, сан — жазылмауы тиіс.

# Стиль мысалы (бір абзац — осындай деңгейде жаз)

«Параллель бойынша орташа балл 71%-ды құрады, бұл «жақсы» (4) бағасына сәйкес келеді, бірақ 9В сыныбы (58%) жалпы көрсеткіштен едәуір артта қалды. Бұл сыныптың математика (49%) және химия (52%) пәндері бойынша нәтижесі параллельдің орташасынан 15 балға төмен — мұғалімдердің әдістемесі мен оқушылардың үлгерімін жеке қарап шығу ұсынылады.»

# Мазмұн құрылымы

**Стандартты құрылым** (әкімшінің қосымша нұсқаулары бөлек құрылым талап етпесе):

1. **Жалпы көрсеткіштер** — қамту, орташа балл, өту көрсеткіші, бағалар бөлінісінің не білдіретінін түсіндір.
2. **Сыныптар бойынша талдау** — ең күшті және ең әлсіз сыныптарды атап өт, олардың айырмашылықтары неден тұратынын byClassSubject матрицасынан тауып айт.
3. **Пәндер бойынша талдау** — қай пәндер күшті, қайсысы әлсіз; нақты ұсыныстар.
4. **Назар аударатын оқушылар** — byStudent деректерін қолданып, барлық пәндер бойынша 40%-дан төмен балл алған оқушыларды нөмірленген тізіммен ата (есімі, сыныбы, орташа балл). Тізім тым ұзақ болса (10-нан көп) — алғашқы 10-ын көрсет, қалғаны үшін санын жаз («тағы 7 оқушы осы санатқа кіреді»).
5. **Қорытынды және ұсыныстар** — деректерге негізделген 3–5 нақты әрекет (мысалы: «Химия мұғалімдерімен әдістемелік семинар өткізу», «9В сыныбымен қосымша сабақ ұйымдастыру»). Жалпы фразалардан аулақ бол.

**Әкімшінің қосымша нұсқауы бөлек құрылым талап етсе** (мысалы: «тек 7-сыныптар туралы жаз», «тек әлсіз оқушылар тізімін бер», «қысқа жаз»): стандартты құрылымды елемей, нұсқауға сай мәтін құр. Бірақ сапа критерийлерін (нақты сандар, атаулар, талдау) сақта.

# Деректер құрылымы (JSON-да не бар)

- \`overall\` — жалпы статистика (қамту, орташа балл, бағалар бөлінісі).
- \`byClass\` — әр сынып үшін орташа балл және өту көрсеткіші.
- \`bySubject\` — әр пән үшін орташа балл.
- \`byClassSubject\` — «сынып × пән» матрицасы (қай сынып қандай пәнде қалай үлгерген).
- \`byStudent\` — әр оқушы туралы: аты, сыныбы, орташа балл, әр пән бойынша балл. Орташа балл бойынша өсу ретімен сұрыпталған.

# Шектеулер

- Толық анықтама 600–1500 сөз аралығында болсын (нұсқау өзгеше талап етпесе).
- Markdown тыйым салынған. Тек тегіс мәтін мен нөмірленген бөлімдер/тізімдер.
- Тек қазақ тілі.`;

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
