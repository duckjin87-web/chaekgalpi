/**
 * YES24 책등(SIDE) 이미지 유틸.
 *
 * 자동 조회는 하지 않는다. YES24 검색 결과가 클라이언트에서 렌더링돼
 * 서버에서 상품번호(goodsNo)를 얻을 수 없음을 확인했다.
 * 대신 사용자가 붙여넣은 값에서 goodsNo 를 뽑아 책등 URL 을 만든다.
 */

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
