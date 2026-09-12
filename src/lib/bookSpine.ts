/**
 * YES24 책등(SIDE) 이미지 유틸.
 *
 * YES24 검색 결과는 JS로 렌더링돼서 서버에서 긁을 수 없다(확인됨).
 * 다만 상품번호(goodsNo)만 알면 책등 이미지는 확실히 가져올 수 있으므로,
 * 사용자가 붙여넣은 값에서 goodsNo 를 뽑아 책등 URL 을 만든다.
 */

/** goodsNo → 책등 이미지 URL */
export function spineUrlFromGoodsNo(goodsNo: string): string {
  return `https://image.yes24.com/goods/${goodsNo}/SIDE/XL`;
}

/**
 * 사용자가 붙여넣은 값에서 책등 이미지 URL 을 만든다.
 * 받아들이는 형태:
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

  // YES24 계열 URL 또는 숫자에서 상품번호 추출
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

/**
 * (자동 조회) ISBN/제목으로 책등 URL 조회.
 * 현재 YES24 검색이 JS 렌더링이라 대부분 null 을 돌려준다.
 * 검색 엔드포인트를 알아내면 다시 살아난다.
 */
export async function fetchSpineUrl(
  isbn?: string,
  title?: string
): Promise<string | null> {
  const cleanIsbn = (isbn ?? "").replace(/[^0-9Xx]/g, "");
  const params = new URLSearchParams();
  if (cleanIsbn) params.set("isbn", cleanIsbn);
  if (title?.trim()) params.set("title", title.trim());
  if ([...params.keys()].length === 0) return null;

  try {
    const res = await fetch(`/api/book-spine?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { spineUrl?: string | null };
    return data.spineUrl ?? null;
  } catch {
    return null;
  }
}
