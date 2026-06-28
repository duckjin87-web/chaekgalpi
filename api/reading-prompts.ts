/**
 * Vercel 서버리스 함수: Gemini API로 책 맞춤 독서 질문 생성.
 * 환경변수 GEMINI_API_KEY 를 Vercel 프로젝트 설정에 등록해야 동작합니다.
 * (키는 서버에만 보관되어 브라우저로 노출되지 않습니다.)
 */

const MODEL = "gemini-2.0-flash";

interface PromptSource {
  title?: string;
  author?: string;
  description?: string;
  categories?: string[];
}

function buildPrompt(src: PromptSource): string {
  const lines = [
    `책 제목: ${src.title ?? "(제목 미상)"}`,
    src.author ? `저자: ${src.author}` : "",
    src.categories?.length ? `장르/분류: ${src.categories.join(", ")}` : "",
    src.description ? `책 소개: ${src.description}` : "",
  ].filter(Boolean);

  return [
    "당신은 깊이 있는 독서를 돕는 독서 토론 코치입니다.",
    "아래 책 정보를 바탕으로, 독자가 이 책을 더 몰입해서 읽도록 돕는 자료를 만들어 주세요.",
    "",
    lines.join("\n"),
    "",
    "요구사항:",
    "- 이 책의 '실제 내용·주제'와 밀접하게 연결된 질문을 만드세요. 어떤 책에나 통하는 일반적인 질문은 피하세요.",
    "- 질문 2개: 읽기 전/중에 스스로 생각해볼 만한 구체적이고 흥미로운 질문.",
    "- 핵심 주제 1개: 책을 관통하는, 깊이 곱씹어볼 만한 핵심 화두 한 가지(한두 문장).",
    "- 모두 한국어로, 정중한 '~까?', '~보기' 같은 어조로 작성하세요.",
    "- 책 소개 정보가 부족하면 제목·저자·장르로부터 합리적으로 추론하되 사실을 지어내지 마세요.",
    "",
    "반드시 아래 JSON 형식으로만 답하세요:",
    '{"questions": ["질문1", "질문2"], "coreTheme": "핵심 주제"}',
  ].join("\n");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
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

    let parsed: { questions?: unknown; coreTheme?: unknown } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      // JSON 블록이 코드펜스로 감싸진 경우 대비
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((q): q is string => typeof q === "string").slice(0, 2)
      : [];
    const coreTheme = typeof parsed.coreTheme === "string" ? parsed.coreTheme : "";

    if (questions.length < 2 || !coreTheme) {
      res.status(502).json({ error: "응답 형식 오류", raw: text });
      return;
    }

    res.status(200).json({ questions, coreTheme });
  } catch (err: any) {
    res.status(500).json({ error: "서버 오류", detail: String(err?.message ?? err) });
  }
}
