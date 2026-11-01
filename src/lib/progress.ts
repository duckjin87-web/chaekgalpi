/** 전자책 진도(%)를 종이책 전체 페이지 기준 페이지로 환산 */
export function percentToPage(percent: number, pageCount: number): number {
  const pct = Math.min(100, Math.max(0, percent));
  return Math.round((pct / 100) * pageCount);
}
