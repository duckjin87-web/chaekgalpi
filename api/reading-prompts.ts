/**
 * Vercel 서버리스 함수: Gemini API로 책 맞춤 독서 질문 생성.
 * 환경변수 GEMINI_API_KEY 를 Vercel 프로젝트 설정에 등록해야 동작합니다.
 * (키는 서버에만 보관되어 브라우저로 노출되지 않습니다.)
 */

// flash-lite: 무료 등급 처리량(RPM)이 높아 쿼터에 덜 걸린다.
const MODEL = "gemini-2.0-flash-lite";

interface PromptSource {
  title?: string;
  author?: string;
  description?: string;
  categories?: string[];
}

function buildPrompt(src: PromptSource): string {
  // 무료 토큰 한도 절약: 책 소개는 앞부분만 사용
  const desc = src.description ? src.description.slice(0, 500) : "";
  const lines = [
    `책 제목: ${src.title ?? "(제목 미상)"}`,
    src.author ? `저자: ${src.author}` : "",
    src.categories?.length ? `장르/분류: ${src.categories.slice(0, 5).join(", ")}` : "",
    desc ? `책 소개: ${desc}` : "",
  ].filter(Boolean);

  return [
    "당신은 깊이 있는 독서를 돕는 독서 토론 코치입니다.",
    "아래 책에 대한 '서평·비평·독자 반응'에서 자주 논의되는 쟁점을 떠올려,",
    "독자가 이 책을 더 몰입해서 읽도록 돕는 토론 질문 3가지를 만들어 주세요.",
    "",
    lines.join("\n"),
    "",
    "요구사항:",
    "- 이 책에 대한 평론가·독자들의 서평에서 실제로 자주 거론되는 쟁점·논쟁·해석을 반영하세요.",
    "- 이 책의 '실제 내용·주제'와 밀접하게 연결된 질문 3가지를 만드세요. 어떤 책에나 통하는 일반적 질문은 피하세요.",
    "- 각 질문은 한 문장으로, 생각을 자극하는 열린 질문으로 작성하세요.",
    "- 모두 한국어로, 정중한 '~까?' 같은 어조로 작성하세요.",
    "- 책 정보가 부족하면 제목·저자·장르로부터 합리적으로 추론하되 사실을 지어내지 마세요.",
    "",
    "반드시 아래 JSON 형식으로만 답하세요:",
    '{"questions": ["질문1", "질문2", "질문3"]}',
  ].join("\n");
}

export default async function handler(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY;

  // GET = 진단용: 키 유무 + 여러 모델 실제 호출 결과를 그대로 보여준다.
  if (req.method === "GET") {
    const debug: Record<string, unknown> = {
      geminiKey: apiKey ? `set(len:${apiKey.length})` : "MISSING",
      defaultModel: MODEL,
      hint: "여러 모델 실시간 테스트는 ?test=1 (각 모델 1회씩 호출)",
    };
    // ?test=1 일 때만 실제 Gemini 호출. 여러 모델을 동시에 점검해 '특정 모델만 막힘' vs '전부 막힘' 구분
    if (apiKey && req.query?.test) {
      const models = [
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-flash",
      ];
      const results: Record<string, unknown> = {};
      for (const m of models) {
        try {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
            }
          );
          const body = await r.text();
          results[m] =
            r.status === 200 ? "200 OK" : `${r.status} :: ${body.replace(/\s+/g, " ").slice(0, 220)}`;
        } catch (err: any) {
          results[m] = `ERR ${String(err?.message ?? err)}`;
        }
      }
      debug.modelTests = results;
      // 사용 가능한 모델 목록도 조회(키/프로젝트 상태 확인)
      try {
        const lr = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        const lb = await lr.json();
        debug.listModelsStatus = lr.status;
        debug.availableModels = Array.isArray(lb?.models)
          ? lb.models.map((x: any) => x.name).slice(0, 40)
          : lb;
      } catch (err: any) {
        debug.listModelsError = String(err?.message ?? err);
      }
    }
    res.status(200).json(debug);
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY 가 설정되지 않았습니다." });
    return;
  }

  try {
    const body: PromptSource =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(body) }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: "application/json",
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      res.status(502).json({ error: "Gemini 호출 실패", detail });
      return;
    }

    const data = await geminiRes.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: { questions?: unknown } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      // JSON 블록이 코드펜스로 감싸진 경우 대비
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((q): q is string => typeof q === "string").slice(0, 3)
      : [];

    if (questions.length < 3) {
      res.status(502).json({ error: "응답 형식 오류", raw: text });
      return;
    }

    res.status(200).json({ questions });
  } catch (err: any) {
    res.status(500).json({ error: "서버 오류", detail: String(err?.message ?? err) });
  }
}
