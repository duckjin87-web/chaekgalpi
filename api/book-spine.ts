/**
 * Vercel 서버리스 함수: ISBN/제목 → YES24 책등(SIDE) 이미지 URL 조회.
 *
 * YES24 책등 이미지 주소 형식:
 *   https://image.yes24.com/goods/{goodsNo}/SIDE/XL
 *
 * goodsNo 는 ISBN 이 아니라 YES24 상품번호다. 검색 페이지에는 광고·추천 상품이
 * 먼저 등장하므로, 후보를 여러 개 뽑은 뒤 각 상품 페이지에 해당 ISBN 이
 * 실제로 있는지 확인해서 올바른 상품을 고른다.
 *
 * 사용:
 *   /api/book-spine?isbn=9791155811234
 *   /api/book-spine?isbn=...&title=...        (ISBN 실패 시 제목으로 재시도)
 *   /api/book-spine?isbn=...&debug=1          (후보/판정 과정 확인)
 * 응답: { spineUrl: string | null, goodsNo?: string, reason?: string }
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

/**
 * 검색 결과 HTML 에서 상품번호 후보들을 순서대로 추출.
 * 광고 배너를 피하려고 검색 결과 목록 컨테이너부터 잘라서 본다.
 */
function extractGoodsNoCandidates(html: string, limit = 8): string[] {
  const markers = ["yesSchList", "goodsList", "itemUnit", "sch-result", "searchResult"];
  let scoped = html;
  for (const m of markers) {
    const i = html.indexOf(m);
    if (i > 0) {
      scoped = html.slice(i);
      break;
    }
  }
  const out: string[] = [];
  const re = /\/(?:Product|product)\/(?:Goods|goods)\/(\d{4,12})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scoped)) !== null && out.length < limit) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  // 결과 영역에서 못 찾으면 전체 문서에서라도 뽑는다
  if (out.length === 0) {
    const re2 = /\/(?:Product|product)\/(?:Goods|goods)\/(\d{4,12})/g;
    while ((m = re2.exec(html)) !== null && out.length < limit) {
      if (!out.includes(m[1])) out.push(m[1]);
    }
  }
  return out;
}

/** 해당 상품 페이지에 이 ISBN 이 실제로 들어있는지 확인 */
async function productMatchesIsbn(goodsNo: string, isbn: string): Promise<boolean> {
  const html = await fetchText(`https://www.yes24.com/product/goods/${goodsNo}`, 7000);
  if (!html) return false;
  return html.includes(isbn);
}

/** 검색 페이지들에서 상품번호 후보 모으기 */
async function collectCandidates(query: string): Promise<string[]> {
  const q = encodeURIComponent(query);
  const urls = [
    `https://www.yes24.com/product/search?domain=BOOK&query=${q}`,
    `https://www.yes24.com/Product/Search?domain=BOOK&query=${q}`,
    `https://m.yes24.com/Search?query=${q}`,
  ];
  const all: string[] = [];
  for (const url of urls) {
    const html = await fetchText(url);
    if (!html) continue;
    for (const c of extractGoodsNoCandidates(html)) {
      if (!all.includes(c)) all.push(c);
    }
    if (all.length >= 8) break;
  }
  return all;
}

/** 책등 이미지가 실제로 존재하는지 확인 (플레이스홀더/404 걸러내기) */
async function spineExists(url: string): Promise<{ ok: boolean; bytes?: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "image/*", Referer: "https://www.yes24.com/" },
    });
    if (!r.ok) return { ok: false };
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return { ok: false };
    const buf = await r.arrayBuffer();
    const bytes = buf.byteLength;
    return { ok: bytes >= 1200, bytes };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req: any, res: any) {
  const isbn = (req.query?.isbn ?? "").toString().replace(/[^0-9Xx]/g, "");
  const title = (req.query?.title ?? "").toString().trim();
  const goodsNoParam = (req.query?.goodsNo ?? "").toString().replace(/[^0-9]/g, "");
  const debug = req.query?.debug === "1";

  if (!isbn && !title && !goodsNoParam) {
    res.status(400).json({ error: "isbn, title 또는 goodsNo 파라미터가 필요합니다." });
    return;
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=2592000, stale-while-revalidate=2592000");

  const dbg: Record<string, unknown> = {};

  try {
    let goodsNo = goodsNoParam;

    if (!goodsNo && isbn) {
      const candidates = await collectCandidates(isbn);
      dbg.isbnCandidates = candidates;
      // 광고 상품이 섞여 있으므로 ISBN 이 실제로 들어있는 상품만 채택
      for (const c of candidates.slice(0, 5)) {
        if (await productMatchesIsbn(c, isbn)) {
          goodsNo = c;
          dbg.matchedBy = "isbn-verified";
          break;
        }
      }
      if (!goodsNo) dbg.isbnVerifyResult = "후보 중 ISBN 일치 상품 없음";
    }

    if (!goodsNo && title) {
      const candidates = await collectCandidates(title);
      dbg.titleCandidates = candidates;
      // 제목 검색은 ISBN 대조가 불가하므로, ISBN 이 있으면 그걸로 검증 시도
      if (isbn) {
        for (const c of candidates.slice(0, 5)) {
          if (await productMatchesIsbn(c, isbn)) {
            goodsNo = c;
            dbg.matchedBy = "title-search+isbn-verified";
            break;
          }
        }
      }
      // ISBN 이 아예 없는 책은 검색 결과 첫 상품을 사용 (검증 불가)
      if (!goodsNo && !isbn && candidates.length) {
        goodsNo = candidates[0];
        dbg.matchedBy = "title-first(unverified)";
      }
    }

    if (!goodsNo) {
      res.status(200).json({
        spineUrl: null,
        reason: "YES24에서 이 책의 상품을 특정하지 못했어요.",
        ...(debug ? { debug: dbg } : {}),
      });
      return;
    }

    const spineUrl = `https://image.yes24.com/goods/${goodsNo}/SIDE/XL`;
    const check = await spineExists(spineUrl);
    dbg.spineBytes = check.bytes;

    res.status(200).json({
      spineUrl: check.ok ? spineUrl : null,
      goodsNo,
      reason: check.ok ? undefined : "이 책은 책등 이미지가 제공되지 않아요.",
      ...(debug ? { debug: dbg } : {}),
    });
  } catch (err: any) {
    res.status(200).json({
      spineUrl: null,
      reason: String(err?.message ?? err),
      ...(debug ? { debug: dbg } : {}),
    });
  }
}
