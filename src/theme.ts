import type { NodeLevel } from "./types";

export const bookmarkColors = [
  "#2F5D50", // 딥그린
  "#7A2E3B", // 버건디
  "#1F3A5F", // 네이비
  "#8A6D3B", // 가죽 갈색
  "#4A4A4A", // 차콜
] as const;

export function randomBookmarkColor(): string {
  return bookmarkColors[Math.floor(Math.random() * bookmarkColors.length)];
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

/** 포스트잇 메모 색상 팔레트 */
export const memoColors = [
  "#FFF3B0", // 노랑
  "#FFD6A5", // 살구
  "#CDEAC0", // 연두
  "#BDE0FE", // 하늘
  "#FFC6D9", // 분홍
] as const;
