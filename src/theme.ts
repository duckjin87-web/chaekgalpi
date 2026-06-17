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
