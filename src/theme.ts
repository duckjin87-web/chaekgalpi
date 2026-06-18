import type { NodeLevel } from "./types";

/** 붉은계열을 제외한 다양한 파스텔 후보 (랜덤 재배치용 풀) */
export const bookmarkColorPool = [
  "#FFE9A8", // 버터옐로우
  "#FFF3B0", // 레몬크림
  "#F4E3A1", // 샌드옐로우
  "#D9EAB0", // 라이트그린
  "#C3E6C3", // 민트그린
  "#B8E0D2", // 세이지
  "#B6E2D3", // 스피어민트
  "#B5D8EB", // 스카이블루
  "#C4D7F2", // 페리윙클
  "#CBD9F0", // 라벤더블루
  "#D6CDEA", // 라일락
  "#E2D4F0", // 라벤더
  "#F0DDEB", // 파우더퍼플
] as const;

export const bookmarkColors: string[] = bookmarkColorPool.slice(0, 5);

export function randomBookmarkColor(): string {
  return bookmarkColorPool[Math.floor(Math.random() * bookmarkColorPool.length)];
}

export function shuffleBookmarkPalette(): string[] {
  return pickRandomUnique(bookmarkColorPool, 5);
}

/** 제목/대/중/소 주제별 표시 스타일 */
export const nodeLevelStyle: Record<
  NodeLevel,
  {
    label: string;
    fontSize: number;
    fontWeight: number;
    minWidth: number;
    padding: string;
    borderWidth: number;
  }
> = {
  title: { label: "제목", fontSize: 22, fontWeight: 800, minWidth: 180, padding: "10px 16px", borderWidth: 5 },
  major: { label: "대", fontSize: 18, fontWeight: 700, minWidth: 150, padding: "8px 14px", borderWidth: 3 },
  medium: { label: "중", fontSize: 15, fontWeight: 600, minWidth: 120, padding: "6px 12px", borderWidth: 2 },
  minor: { label: "소", fontSize: 13, fontWeight: 500, minWidth: 100, padding: "5px 10px", borderWidth: 1 },
};

export const nodeLevelOrder: NodeLevel[] = ["title", "major", "medium", "minor"];

/** 붉은계열을 제외한 포스트잇 메모 색상 후보 (랜덤 재배치용 풀) */
export const memoColorPool = [
  "#FFF1B8", // 버터옐로우
  "#FFF6C9", // 레몬크림
  "#F5ECA8", // 샌드옐로우
  "#E2EFB6", // 라이트그린
  "#D2EAC8", // 민트그린
  "#C7E8DC", // 세이지민트
  "#C2E4E0", // 스피어민트
  "#C5DFF0", // 스카이블루
  "#D1DFF5", // 페리윙클
  "#DCD6F2", // 라벤더
  "#E6D8EF", // 라일락
  "#F0E0F0", // 파우더퍼플
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
