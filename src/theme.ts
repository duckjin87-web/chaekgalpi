import type { NodeLevel } from "./types";

/** 밝고 따뜻한 파스텔 후보 (랜덤 재배치용 풀) */
export const bookmarkColorPool = [
  "#FFD3B0", // 살구
  "#FFB5A7", // 코랄핑크
  "#FFE5A0", // 버터옐로우
  "#F6C28B", // 애프리콧
  "#F4A988", // 테라코타 파스텔
  "#FFCBA4", // 피치
  "#FFDDC1", // 크림오렌지
  "#F8B89C", // 멜론
  "#EFC3A0", // 샌드베이지
  "#F0A8A0", // 더스티로즈
  "#FAD2B6", // 라이트 살몬
  "#F2C6B4", // 웜베이지핑크
] as const;

export const bookmarkColors: string[] = bookmarkColorPool.slice(0, 5);

export function randomBookmarkColor(): string {
  return bookmarkColorPool[Math.floor(Math.random() * bookmarkColorPool.length)];
}

export function shuffleBookmarkPalette(): string[] {
  return pickRandomUnique(bookmarkColorPool, 5);
}

/** 대/중/소 주제별 표시 스타일 */
export const nodeLevelStyle: Record<
  NodeLevel,
  { label: string; fontSize: number; fontWeight: number; minWidth: number; padding: string }
> = {
  title: { label: "제목", fontSize: 22, fontWeight: 800, minWidth: 180, padding: "10px 16px" },
  major: { label: "대주제", fontSize: 18, fontWeight: 700, minWidth: 150, padding: "8px 14px" },
  medium: { label: "중주제", fontSize: 15, fontWeight: 600, minWidth: 120, padding: "6px 12px" },
  minor: { label: "소주제", fontSize: 13, fontWeight: 500, minWidth: 100, padding: "5px 10px" },
};

export const nodeLevelOrder: NodeLevel[] = ["title", "major", "medium", "minor"];

/** 포스트잇 메모 색상 후보 (랜덤 재배치용 풀) */
export const memoColorPool = [
  "#FFF1B8", // 버터옐로우
  "#FFDCB0", // 피치
  "#FFD0C7", // 블러쉬핑크
  "#FFE1A8", // 크림오렌지
  "#FFC9B0", // 코랄
  "#FFEAA0", // 레몬
  "#FFD6D6", // 라이트로즈
  "#FFE2C6", // 살구크림
  "#FBDDB0", // 허니
  "#FFD8B1", // 멜론오렌지
] as const;

export const memoColors: string[] = memoColorPool.slice(0, 5);

export function randomMemoColor(): string {
  return memoColorPool[Math.floor(Math.random() * memoColorPool.length)];
}

export function shuffleMemoPalette(): string[] {
  return pickRandomUnique(memoColorPool, 5);
}

function pickRandomUnique(pool: readonly string[], count: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
