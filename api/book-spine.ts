/**
 * Vercel 서버리스 함수: ISBN → YES24 책등(SIDE) 이미지 URL 조회.
 *
 * YES24 책등 이미지 주소 형식:
 *   https://image.yes24.com/goods/{goodsNo}/SIDE/XL
 * goodsNo 는 ISBN 이 아니라 YES24 상품번호라, ISBN 으로 상품 페이지를 찾아
 * goodsNo 를 추출한 뒤 책등 이미지 존재 여부를 확인해서 돌려준다.
 *
 * 사용: /api/book-spine?isbn=9791155811234
 * 응답: { spineUrl: string | null, goodsNo?: string, reason?: string }
 *
 * 참고: 전자책·외국도서 등 일부 도서는 책등 이미지가 없다. 그 경우 spineUrl: null.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** YES24 검색 결과 HTML 에서 상품번호(goodsNo) 추출 */
function extractGoodsNo(html: string): string | null {
  const patterns = [
    /\/Product\/Goods\/(\d{4,12})/,
    /goodsNo["'=:\s]+(\d{4,12})/i,
    /image\.yes24\.com\/goods\/(\d{4,12})/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** 검색어(ISBN 또는 제목)로 YES24 상품번호 찾기 */
async function findGoodsNo(query: string): Promise<string | null> {
  const q = encodeURIComponent(query);
  const candidates = [
    `https://www.yes24.com/product/search?domain=BOOK&query=${q}`,
    `https://www.yes24.com/Product/Search?domain=BOOK&query=${q}`,
    `https://www.yes24.com/Product/Search?domain=ALL&query=${q}`,
    `https://m.yes24.com/Search?query=${q}`,
  ];
  for (const url of candidates) {
    const html = await fetchText(url);
    if (!html) continue;
    const goodsNo = extractGoodsNo(html);
    if (goodsNo) return goodsNo;
  }
  return null;
}

/** 책등 이미지가 실제로 존재하는지 확인 (플레이스홀더/404 걸러내기) */
async function spineExists(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "image/*", Referer: "https://www.yes24.com/" },
    });
    if (!r.ok) return false;
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return false;
    const len = Number(r.headers.get("content-length") ?? 0);
    // 없는 책등은 아주 작은 플레이스홀더로 응답하는 경우가 있어 최소 크기로 거른다
    if (len && len < 1200) return false;
    if (!len) {
      const buf = await r.arrayBuffer();
      if (buf.byteLength < 1200) return false;
    }
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req: any, res: any) {
  const isbn = (req.query?.isbn ?? "").toString().replace(/[^0-9Xx]/g, "");
  const title = (req.query?.title ?? "").toString().trim();
  const goodsNoParam = (req.query?.goodsNo ?? "").toString().replace(/[^0-9]/g, "");

  if (!isbn && !title && !goodsNoParam) {
    res.status(400).json({ error: "isbn, title 또는 goodsNo 파라미터가 필요합니다." });
    return;
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // 책등 이미지는 거의 바뀌지 않으므로 길게 캐시 (없는 경우도 캐시해 재조회 방지)
  res.setHeader("Cache-Control", "public, s-maxage=2592000, stale-while-revalidate=2592000");

  try {
    // ISBN 우선, 없거나 못 찾으면 제목으로 재시도
    let goodsNo = goodsNoParam;
    if (!goodsNo && isbn) goodsNo = (await findGoodsNo(isbn)) ?? "";
    if (!goodsNo && title) goodsNo = (await findGoodsNo(title)) ?? "";
    if (!goodsNo) {
      res.status(200).json({ spineUrl: null, reason: "YES24 상품번호를 찾지 못했어요." });
      return;
    }

    const spineUrl = `https://image.yes24.com/goods/${goodsNo}/SIDE/XL`;
    const ok = await spineExists(spineUrl);
    res.status(200).json({
      spineUrl: ok ? spineUrl : null,
      goodsNo,
      reason: ok ? undefined : "이 책은 책등 이미지가 제공되지 않아요.",
    });
  } catch (err: any) {
    res.status(200).json({ spineUrl: null, reason: String(err?.message ?? err) });
  }
}
