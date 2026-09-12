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

/** 문자열에서 숫자/X 만 남겨 ISBN 비교를 하이픈·공백에 영향받지 않게 */
function normalizeForIsbn(s: string): string {
  return s.replace(/[^0-9Xx]/g, "");
}

interface ProductCheck {
  goodsNo: string;
  url?: string;
  htmlLen?: number;
  isbnFound?: boolean;
  isbnSnippet?: string;
}

/** 해당 상품 페이지에 이 ISBN 이 실제로 들어있는지 확인 (URL 대소문자 두 가지 시도) */
async function checkProduct(goodsNo: string, isbn: string): Promise<ProductCheck> {
  const urls = [
    `https://www.yes24.com/product/goods/${goodsNo}`,
    `https://www.yes24.com/Product/Goods/${goodsNo}`,
  ];
  for (const url of urls) {
    const html = await fetchText(url, 10000);
    if (!html) continue;

    // 1) 원문 그대로 포함되는지
    let found = html.includes(isbn);
    // 2) 하이픈 등이 섞인 표기 대비: ISBN 주변 영역만 정규화해서 비교
    if (!found) {
      const idx = html.search(/ISBN/i);
      if (idx >= 0) {
        const around = html.slice(idx, idx + 4000);
        found = normalizeForIsbn(around).includes(isbn);
      }
    }
    // 3) 그래도 없으면 문서 전체 정규화 (비용 크지만 최후 수단)
    if (!found) {
      found = normalizeForIsbn(html).includes(isbn);
    }

    const idx2 = html.search(/ISBN/i);
    return {
      goodsNo,
      url,
      htmlLen: html.length,
      isbnFound: found,
      isbnSnippet:
        idx2 >= 0
          ? stripTagsShort(html.slice(idx2, idx2 + 400))
          : "(페이지에 ISBN 문자열 없음)",
    };
  }
  return { goodsNo, isbnFound: false, isbnSnippet: "(상품 페이지 로드 실패)" };
}

function stripTagsShort(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/** 검색 페이지들에서 상품번호 후보 모으기 */
async function collectCandidates(
  query: string,
  dbg?: Record<string, unknown>
): Promise<string[]> {
  const q = encodeURIComponent(query);
  const urls = [
    `https://www.yes24.com/product/search?domain=BOOK&query=${q}`,
    `https://www.yes24.com/Product/Search?domain=BOOK&query=${q}`,
    `https://www.yes24.com/product/search?query=${q}`,
    `https://www.yes24.com/Product/Search?domain=ALL&query=${q}`,
    `https://m.yes24.com/Search?query=${q}`,
    `https://m.yes24.com/search?query=${q}`,
    `https://www.yes24.com/searchcorner/Search?domain=BOOK&query=${q}`,
  ];
  const trace: unknown[] = [];
  for (const url of urls) {
    const html = await fetchText(url);
    if (!html) {
      trace.push({ url, ok: false });
      continue;
    }
    // 검색이 실제로 먹혔는지 = 검색어가 결과 HTML 에 있는지로 판정.
    // 없으면 YES24 기본/광고 페이지를 받은 것이므로 그 후보는 절대 쓰지 않는다.
    const queryInHtml = html.includes(query);
    const found = extractGoodsNoCandidates(html);
    trace.push({
      url,
      ok: true,
      htmlLen: html.length,
      queryInHtml,
      foundCount: found.length,
      sample: found.slice(0, 4),
    });
    if (queryInHtml && found.length) {
      if (dbg) dbg.searchTrace = trace;
      return found;
    }
  }
  if (dbg) {
    dbg.searchTrace = trace;
    dbg.searchNote =
      "검색어가 포함된 결과 페이지를 얻지 못했습니다 (YES24 검색이 JS로 렌더링되거나 URL 형식이 다를 수 있음).";
  }
  return [];
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
      const candidates = await collectCandidates(isbn, dbg);
      dbg.isbnCandidates = candidates;
      const checks: ProductCheck[] = [];
      for (const c of candidates.slice(0, 5)) {
        const chk = await checkProduct(c, isbn);
        checks.push(chk);
        if (chk.isbnFound) {
          goodsNo = c;
          dbg.matchedBy = "isbn-verified";
          break;
        }
      }
      dbg.isbnChecks = checks;
      if (!goodsNo) dbg.isbnVerifyResult = "후보 중 ISBN 일치 상품 없음";
    }

    if (!goodsNo && title) {
      const candidates = await collectCandidates(title, dbg);
      dbg.titleCandidates = candidates;
      if (isbn) {
        const checks: ProductCheck[] = [];
        for (const c of candidates.slice(0, 5)) {
          const chk = await checkProduct(c, isbn);
          checks.push(chk);
          if (chk.isbnFound) {
            goodsNo = c;
            dbg.matchedBy = "title-search+isbn-verified";
            break;
          }
        }
        dbg.titleChecks = checks;
      }
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
