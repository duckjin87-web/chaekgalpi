import type { ReadingPrompts } from "../types";

export interface PromptSource {
  title: string;
  author?: string;
  categories?: string[];
  description?: string;
}

type Genre =
  | "fiction"
  | "selfhelp"
  | "history"
  | "science"
  | "philosophy"
  | "essay"
  | "general";

// 카테고리/설명 텍스트에서 장르 추정 (영문 카테고리 + 한글 설명 모두 대응)
function detectGenre(source: PromptSource): Genre {
  const text = [
    ...(source.categories ?? []),
    source.description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const has = (...keys: string[]) => keys.some((k) => text.includes(k));

  if (
    has(
      "fiction",
      "novel",
      "literary",
      "소설",
      "문학",
      "장편",
      "단편",
      "이야기",
      "story"
    )
  )
    return "fiction";
  if (
    has(
      "self-help",
      "business",
      "economic",
      "management",
      "psychology",
      "money",
      "success",
      "habit",
      "자기계발",
      "경영",
      "경제",
      "심리",
      "습관",
      "성공",
      "투자",
      "처세"
    )
  )
    return "selfhelp";
  if (
    has(
      "history",
      "biography",
      "memoir",
      "역사",
      "전기",
      "평전",
      "회고"
    )
  )
    return "history";
  if (
    has(
      "science",
      "technology",
      "physics",
      "biology",
      "mathematics",
      "computer",
      "과학",
      "기술",
      "물리",
      "생물",
      "수학",
      "공학",
      "의학"
    )
  )
    return "science";
  if (
    has(
      "philosophy",
      "religion",
      "ethics",
      "spiritual",
      "철학",
      "종교",
      "윤리",
      "사상",
      "명상"
    )
  )
    return "philosophy";
  if (has("essay", "essays", "에세이", "산문", "수필")) return "essay";
  return "general";
}

interface Template {
  questions: string[];
  coreThemes: string[];
}

const TEMPLATES: Record<Genre, Template> = {
  fiction: {
    questions: [
      "{title}에서 가장 마음이 가는 인물은 누구이고, 그 이유는 무엇일까?",
      "이야기 속 인물이 내린 선택을 나라면 어떻게 했을까?",
      "작가가 이 이야기를 통해 진짜 하고 싶었던 말은 무엇일까?",
      "결말을 읽기 전에 예상한 전개와 실제 전개는 어떻게 달랐을까?",
    ],
    coreThemes: [
      "인물들의 갈등이 결국 어떤 보편적인 인간의 욕망이나 두려움을 비추는지 생각해보기",
      "이 이야기가 던지는 질문을 '내 삶'으로 옮겨오면 무엇이 되는지 곱씹어보기",
    ],
  },
  selfhelp: {
    questions: [
      "{title}에서 제안하는 방법 중 당장 내 일상에 적용해볼 한 가지는?",
      "지금 내가 가진 문제 중 이 책이 도와줄 수 있는 건 무엇일까?",
      "저자의 주장 가운데 동의하기 어려운 부분은 어디이고 왜 그럴까?",
    ],
    coreThemes: [
      "책의 조언을 '아는 것'에서 '실제 행동'으로 바꾸려면 무엇이 필요한지 정리해보기",
      "저자가 전제하는 가치관이 내 상황에도 그대로 맞는지 비판적으로 따져보기",
    ],
  },
  history: {
    questions: [
      "{title}이 다루는 시대와 오늘날은 어떤 점에서 닮았고 어떤 점에서 다를까?",
      "그때 사람들의 선택을 그 시대의 한계 속에서 어떻게 이해할 수 있을까?",
      "이 사건/인물이 없었다면 역사는 어떻게 흘러갔을까?",
    ],
    coreThemes: [
      "과거의 사건에서 지금 우리가 되풀이하지 말아야 할 교훈을 끌어내보기",
      "역사를 기록한 사람의 관점과 빠진 목소리는 무엇인지 살펴보기",
    ],
  },
  science: {
    questions: [
      "{title}의 핵심 개념을 한 문장으로 설명한다면 어떻게 표현할까?",
      "이 내용이 내 일상이나 사회에 실제로 어떤 영향을 줄까?",
      "읽으면서 가장 직관에 어긋났던, 놀라웠던 사실은 무엇일까?",
    ],
    coreThemes: [
      "복잡한 개념을 남에게 쉽게 설명할 수 있을 만큼 내 언어로 재구성해보기",
      "저자의 결론이 어떤 근거와 데이터 위에 서 있는지 따라가 보기",
    ],
  },
  philosophy: {
    questions: [
      "{title}이 던지는 질문에 대해 지금 나의 답은 무엇일까?",
      "저자의 관점과 내가 평소 믿어온 생각은 어디서 부딪힐까?",
      "이 사유를 실제 삶의 어떤 순간에 적용해볼 수 있을까?",
    ],
    coreThemes: [
      "책이 흔들어 놓는 '당연하게 여겨온 전제'가 무엇인지 찾아보기",
      "저자의 논리를 끝까지 따라갔을 때 받아들일 수 있는 결론인지 검토해보기",
    ],
  },
  essay: {
    questions: [
      "{title}의 어떤 문장이 내 경험과 가장 깊게 맞닿았을까?",
      "저자의 시선과 내 시선이 갈라지는 지점은 어디일까?",
      "이 글을 읽고 떠오른 나만의 장면이나 기억은 무엇일까?",
    ],
    coreThemes: [
      "저자가 일상의 사소한 것에서 길어 올린 의미를 내 삶에서도 찾아보기",
      "글의 분위기와 태도가 나에게 어떤 감정을 남기는지 음미해보기",
    ],
  },
  general: {
    questions: [
      "{title}을 읽기로 한 나의 기대나 궁금증은 무엇일까?",
      "이 책에서 꼭 하나만 얻어간다면 무엇이었으면 할까?",
      "다 읽고 난 뒤, 어떤 점이 달라지길 바랄까?",
    ],
    coreThemes: [
      "책의 메시지를 내 삶의 구체적인 상황과 연결지어 곱씹어보기",
      "저자가 말하는 것과 말하지 않는 것을 함께 읽어보기",
    ],
  },
};

function pickDistinct<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

export function generateReadingPrompts(source: PromptSource): ReadingPrompts {
  const genre = detectGenre(source);
  const template = TEMPLATES[genre];
  const title = source.title.trim() || "이 책";

  // 질문 3가지 구성: 장르 질문 풀에서 뽑되, 부족하면 핵심 주제를 질문화해 보충
  const pool = [...template.questions];
  if (pool.length < 3) {
    template.coreThemes.forEach((t) => pool.push(`${t.replace(/보기$/, "보면 어떨까")}?`));
  }
  const questions = pickDistinct(pool, 3).map((q) => q.replace(/\{title\}/g, `《${title}》`));

  return { questions };
}

/**
 * Gemini(서버리스 함수)로 책의 서평·비평 기반 질문 3가지를 받아온다.
 * API 미설정/네트워크 실패 시 로컬 휴리스틱 생성기로 자동 폴백한다.
 */
export async function fetchReadingPrompts(
  source: PromptSource
): Promise<{ prompts: ReadingPrompts; source: "ai" | "local" }> {
  try {
    const res = await fetch("/api/reading-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: source.title,
        author: source.author,
        description: source.description,
        categories: source.categories,
      }),
    });
    if (!res.ok) throw new Error("AI 응답 실패");
    const data = await res.json();
    if (Array.isArray(data.questions) && data.questions.length >= 3) {
      return {
        prompts: { questions: data.questions.slice(0, 3) },
        source: "ai",
      };
    }
    throw new Error("AI 응답 형식 오류");
  } catch {
    return { prompts: generateReadingPrompts(source), source: "local" };
  }
}
