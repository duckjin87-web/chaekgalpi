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

import iconv from "iconv-lite";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** 검색어를 EUC-KR 로 percent-encode (구형 YES24 검색이 ks_c_5601-1987 사용) */
function eucKrPercentEncode(s: string): string {
  const buf = iconv.encode(s, "euc-kr");
  let out = "";
  for (const b of buf) {
    const unreserved =
      (b >= 0x30 && b <= 0x39) ||
      (b >= 0x41 && b <= 0x5a) ||
      (b >= 0x61 && b <= 0x7a) ||
      b === 0x2d ||
      b === 0x5f ||
      b === 0x2e ||
      b === 0x7e;
    out += unreserved
      ? String.fromCharCode(b)
      : "%" + b.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

/** 응답 charset(EUC-KR/UTF-8)을 보고 올바르게 디코드 */
async function readHtml(r: Response): Promise<string> {
  const ct = r.headers.get("content-type") ?? "";
  const buf = Buffer.from(await r.arrayBuffer());
  if (/ks_c_5601|euc-?kr|cp949/i.test(ct)) return iconv.decode(buf, "euc-kr");
  // charset 이 없으면 meta 태그로 재판정
  const asUtf8 = buf.toString("utf8");
  if (/charset\s*=\s*["']?\s*(ks_c_5601|euc-?kr|cp949)/i.test(asUtf8.slice(0, 2000))) {
    return iconv.decode(buf, "euc-kr");
  }
  return asUtf8;
}

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
    return await readHtml(r);
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
/** 상품 링크에서 상품번호를 뽑는 정규식 — 모바일(/goods/detail/N), 데스크톱(/Product/Goods/N) 모두 */
const GOODS_LINK_RE = /\/(?:goods\/detail|Product\/Goods|product\/goods)\/(\d{4,12})/g;

function extractGoodsNoCandidates(html: string, limit = 8): string[] {
  const markers = [
    "goodsList",
    "yesSchList",
    "itemUnit",
    "sch-result",
    "searchResult",
    "sch_list",
    "list_search",
  ];
  let scoped = html;
  for (const m of markers) {
    const i = html.indexOf(m);
    if (i > 0) {
      scoped = html.slice(i);
      break;
    }
  }
  const pick = (src: string): string[] => {
    const out: string[] = [];
    const re = new RegExp(GOODS_LINK_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null && out.length < limit) {
      if (!out.includes(m[1])) out.push(m[1]);
    }
    return out;
  };
  const scopedHits = pick(scoped);
  // 결과 영역에서 못 찾으면 전체 문서에서라도 뽑는다
  return scopedHits.length ? scopedHits : pick(html);
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
  // 모바일 상세 페이지 형식 (확인됨): m.yes24.com/goods/detail/{goodsNo}
  const urls = [
    `https://m.yes24.com/goods/detail/${goodsNo}`,
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
  // 모바일 검색이 실제로 동작하는 형식 (확인됨): m.yes24.com/search?domain=ALL&query=
  const urls = [
    `https://m.yes24.com/search?domain=ALL&query=${q}`,
    `https://m.yes24.com/search?domain=BOOK&query=${q}`,
    `https://www.yes24.com/product/search?domain=BOOK&query=${q}`,
    `https://www.yes24.com/Product/Search?domain=BOOK&query=${q}`,
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

/**
 * 진단용: YES24 검색 결과를 서버에서 받을 수 있는 엔드포인트를 탐색.
 * /api/book-spine?probe=브레이크넥
 * 각 후보의 상태·길이·검색어 포함 여부·상품번호 추출 결과를 돌려준다.
 */
async function probeEndpoints(query: string) {
  const q = encodeURIComponent(query);
  const qe = eucKrPercentEncode(query); // 구형 검색용 EUC-KR 인코딩
  const candidates = [
    // ★ EUC-KR 로 질의 + EUC-KR 로 디코드 (구형 searchcorner)
    `https://www.yes24.com/searchcorner/Search?keywordAd=&keyword=&domain=BOOK&query=${qe}`,
    `https://www.yes24.com/searchcorner/Search?domain=ALL&query=${qe}`,
    `https://www.yes24.com/SearchCorner/Search?domain=BOOK&query=${qe}`,
    // UTF-8 질의 + charset 자동판정 디코드
    `https://www.yes24.com/searchcorner/Search?keywordAd=&keyword=&domain=BOOK&query=${q}`,
    // 모바일 내부 목록 API 후보
    `https://m.yes24.com/search/getSearchList?domain=ALL&query=${q}`,
    `https://m.yes24.com/Search/GetSearchList?domain=ALL&query=${q}`,
    `https://m.yes24.com/search/searchList?domain=ALL&query=${q}`,
    `https://m.yes24.com/search/list?domain=ALL&query=${q}`,
    `https://m.yes24.com/api/search?query=${q}`,
    // 데스크톱 내부 목록 API 후보
    `https://www.yes24.com/Product/Search/GetSearchList?domain=BOOK&query=${q}`,
    `https://www.yes24.com/product/search/list?domain=BOOK&query=${q}`,
    `https://www.yes24.com/Product/Search/List?domain=BOOK&query=${q}`,
    // 자동완성/검색어 서비스 후보
    `https://ac.yes24.com/ac/search?query=${q}`,
    `https://www.yes24.com/Templates/FTSearchWord.aspx?query=${q}`,
    // 구형 검색(서버 렌더링 가능성)
    `https://www.yes24.com/searchcorner/Search?keywordAd=&keyword=&domain=BOOK&query=${q}`,
    `https://m.yes24.com/Search/Search?query=${q}`,
  ];

  const out: unknown[] = [];
  for (const url of candidates) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    try {
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          "User-Agent": UA,
          Accept: "application/json, text/html;q=0.9, */*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9",
          "X-Requested-With": "XMLHttpRequest",
          Referer: "https://m.yes24.com/",
        },
      });
      const ct = r.headers.get("content-type") ?? "";
      const body = r.ok ? await readHtml(r) : "";
      const goods = body ? extractGoodsNoCandidates(body, 4) : [];
      // 검색어가 본문에 있으면 그 주변을 보여줘 실제 결과인지 확인
      const at = body.indexOf(query);
      out.push({
        url,
        status: r.status,
        contentType: ct.slice(0, 40),
        len: body.length,
        queryInBody: at >= 0,
        goods,
        around:
          at >= 0
            ? body
                .slice(Math.max(0, at - 120), at + 200)
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
            : undefined,
        head: body.slice(0, 120).replace(/\s+/g, " "),
      });
    } catch (e: any) {
      out.push({ url, error: String(e?.message ?? e).slice(0, 80) });
    } finally {
      clearTimeout(t);
    }
  }
  return out;
}

/**
 * 진단용: ISBN 을 그대로 넣는 이미지 URL 패턴을 탐색.
 * 검색 없이 ISBN 만으로 책등을 얻을 수 있는 경로가 있으면 완전 자동화 가능.
 * /api/book-spine?imgprobe=9791193937198
 */
async function probeImagePatterns(isbn: string) {
  const patterns: string[] = [
    // 교보문고 (이미지 경로에 ISBN 사용)
    `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn}.jpg`,
    `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn}_side.jpg`,
    `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn}_s.jpg`,
    `https://contents.kyobobook.co.kr/sih/fit-in/458x0/spine/${isbn}.jpg`,
    `https://contents.kyobobook.co.kr/sih/fit-in/458x0/side/${isbn}.jpg`,
    `https://contents.kyobobook.co.kr/pdt/${isbn}.jpg`,
    `https://contents.kyobobook.co.kr/pdt/${isbn}_side.jpg`,
    // 알라딘 (ISBN 기반 커버 엔드포인트)
    `https://image.aladin.co.kr/cover/cover/${isbn}_1.jpg`,
    `https://image.aladin.co.kr/cover/spine/${isbn}_1.jpg`,
    `https://image.aladin.co.kr/cover/side/${isbn}_1.jpg`,
    // YES24 (ISBN 을 goodsNo 자리에 — 가능성 낮지만 확인)
    `https://image.yes24.com/goods/${isbn}/SIDE/XL`,
    // 참고: 앞표지가 ISBN 으로 되는지 (패턴 유효성 확인용 대조군)
    `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
  ];

  const out: unknown[] = [];
  for (const url of patterns) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try {
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": UA, Accept: "image/*" },
      });
      let bytes = 0;
      if (r.ok) bytes = (await r.arrayBuffer()).byteLength;
      out.push({
        url,
        status: r.status,
        contentType: (r.headers.get("content-type") ?? "").slice(0, 30),
        bytes,
        looksLikeImage: r.ok && bytes > 1200,
      });
    } catch (e: any) {
      out.push({ url, error: String(e?.message ?? e).slice(0, 60) });
    } finally {
      clearTimeout(t);
    }
  }
  return out;
}

export default async function handler(req: any, res: any) {
  // 진단 모드: ISBN 기반 이미지 URL 패턴 탐색
  const imgprobe = (req.query?.imgprobe ?? "").toString().replace(/[^0-9Xx]/g, "");
  if (imgprobe) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ isbn: imgprobe, results: await probeImagePatterns(imgprobe) });
    return;
  }

  // 진단 모드
  const probe = (req.query?.probe ?? "").toString().trim();
  if (probe) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    try {
      res.status(200).json({ probe, results: await probeEndpoints(probe) });
    } catch (err: any) {
      res.status(200).json({ probe, error: String(err?.message ?? err) });
    }
    return;
  }

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
