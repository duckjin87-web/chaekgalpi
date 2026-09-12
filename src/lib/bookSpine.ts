/**
 * YES24 책등(SIDE) 이미지 유틸.
 *
 * 자동 조회는 /api/book-spine 이 담당한다
 * (m.yes24.com/Search/SearchContentsJson 으로 상품번호를 얻어 책등 URL 생성).
 * 자동으로 못 찾은 책은 사용자가 상품번호/링크를 붙여넣어 직접 지정할 수 있다.
 */

export interface SpineLookup {
  spineUrl: string | null;
  /**
   * true  = 확정된 결과 (찾았거나, YES24에 정말 없음) → 다시 조회할 필요 없음
   * false = 통신 실패/타임아웃 → 다음에 다시 시도해야 함
   */
  definitive: boolean;
}

/** ISBN/제목으로 책등 URL 자동 조회 */
export async function fetchSpineUrl(isbn?: string, title?: string): Promise<SpineLookup> {
  const cleanIsbn = (isbn ?? "").replace(/[^0-9Xx]/g, "");
  const params = new URLSearchParams();
  if (cleanIsbn) params.set("isbn", cleanIsbn);
  if (title?.trim()) params.set("title", title.trim());
  // 조회할 단서가 없으면 재시도해도 의미 없으므로 확정 처리
  if ([...params.keys()].length === 0) return { spineUrl: null, definitive: true };

  try {
    const res = await fetch(`/api/book-spine?${params.toString()}`);
    if (!res.ok) return { spineUrl: null, definitive: false };
    const data = (await res.json()) as {
      spineUrl?: string | null;
      status?: "found" | "no-spine" | "not-found" | "error";
    };
    return {
      spineUrl: data.spineUrl ?? null,
      definitive: data.status !== "error",
    };
  } catch {
    // 오프라인 등 네트워크 오류 → 재시도 대상
    return { spineUrl: null, definitive: false };
  }
}

/** goodsNo → 책등 이미지 URL */
export function spineUrlFromGoodsNo(goodsNo: string): string {
  return `https://image.yes24.com/goods/${goodsNo}/SIDE/XL`;
}

/**
 * 붙여넣은 값에서 책등 이미지 URL 을 만든다. 받아들이는 형태:
 *  - 상품번호:        176223281
 *  - 상품 상세 URL:   https://m.yes24.com/goods/detail/176223281
 *                     https://www.yes24.com/product/goods/176223281
 *  - 책등 이미지 URL: https://image.yes24.com/goods/176223281/SIDE/XL
 *  - 표지 이미지 URL: https://image.yes24.com/goods/176223281/XL
 * 인식 불가하면 undefined.
 */
export function normalizeSpineInput(input: string): string | undefined {
  const raw = input.trim();
  if (!raw) return undefined;

  // 이미 완성된 책등 URL 이면 그대로 사용
  if (/^https?:\/\/image\.yes24\.com\/goods\/\d{4,12}\/SIDE\//i.test(raw)) {
    return raw.replace(/^http:/, "https:");
  }

  const patterns = [
    /image\.yes24\.com\/goods\/(\d{4,12})/i,
    /\/goods\/detail\/(\d{4,12})/i,
    /\/(?:Product|product)\/(?:Goods|goods)\/(\d{4,12})/,
    /^(\d{4,12})$/,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) return spineUrlFromGoodsNo(m[1]);
  }
  return undefined;
}
