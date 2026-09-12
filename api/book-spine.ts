/**
 * Vercel 서버리스 함수: ISBN/제목 → YES24 책등(SIDE) 이미지 URL 조회.
 *
 * YES24 검색은 클라이언트에서 렌더링되지만, 목록을 만들어주는 JSON 엔드포인트가 있다:
 *   https://m.yes24.com/Search/SearchContentsJson?query=<검색어>
 *     → { listHtml: "...검색 결과 목록 HTML...", filterHtml: "..." }
 * 이 listHtml 안의 /goods/detail/{goodsNo} 링크에서 상품번호를 얻고,
 *   https://image.yes24.com/goods/{goodsNo}/SIDE/XL
 * 로 책등 이미지를 만든다. (모바일 User-Agent 필요)
 *
 * 사용:
 *   /api/book-spine?isbn=9791193937198
 *   /api/book-spine?isbn=...&title=...      (ISBN 실패 시 제목으로 재시도)
 *   /api/book-spine?...&debug=1
 * 응답: { spineUrl: string|null, goodsNo?: string, matchedBy?: string, reason?: string }
 */

const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** 모바일 상품 링크에서 상품번호 추출 */
function extractGoodsNos(html: string, limit = 6): string[] {
  const out: string[] = [];
  const re = /\/goods\/detail\/(\d{4,12})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < limit) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/**
 * YES24 검색 JSON 으로 상품번호 후보 얻기.
 * netError=true 는 통신 실패(재시도 대상), false 는 정상 응답(결과 0건일 수 있음).
 */
async function searchGoodsNos(
  query: string
): Promise<{ nos: string[]; status: number; len: number; netError: boolean }> {
  const url = `https://m.yes24.com/Search/SearchContentsJson?query=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA_MOBILE,
        Accept: "application/json, text/javascript, */*",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        Referer: "https://m.yes24.com/",
      },
    });
    if (!r.ok) return { nos: [], status: r.status, len: 0, netError: true };
    const text = await r.text();
    let listHtml = "";
    try {
      const data = JSON.parse(text) as { listHtml?: string };
      listHtml = data.listHtml ?? "";
    } catch {
      listHtml = text; // JSON 이 아니면 원문에서라도 시도
    }
    return {
      nos: extractGoodsNos(listHtml),
      status: r.status,
      len: text.length,
      netError: false,
    };
  } catch {
    // 타임아웃/네트워크 오류
    return { nos: [], status: 0, len: 0, netError: true };
  } finally {
    clearTimeout(t);
  }
}

/** 상품 상세에 해당 ISBN 이 있는지 확인 (제목 검색 결과 검증용) */
async function productHasIsbn(goodsNo: string, isbn: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(`https://m.yes24.com/goods/detail/${goodsNo}`, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA_MOBILE,
        Accept: "text/html",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    if (!r.ok) return false;
    const html = await r.text();
    if (html.includes(isbn)) return true;
    return html.replace(/[^0-9Xx]/g, "").includes(isbn);
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/**
 * 책등 이미지가 실제로 존재하는지 확인.
 * netError=true 는 통신 실패(재시도 대상). 404/작은 플레이스홀더는 '정말 없음'.
 */
async function spineExists(
  url: string
): Promise<{ ok: boolean; bytes: number; netError: boolean }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA_MOBILE, Accept: "image/*", Referer: "https://m.yes24.com/" },
    });
    // 404/410 = 이 책에 책등 이미지가 없음(확정). 5xx = 서버 문제(재시도)
    if (!r.ok) return { ok: false, bytes: 0, netError: r.status >= 500 };
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return { ok: false, bytes: 0, netError: false };
    const bytes = (await r.arrayBuffer()).byteLength;
    return { ok: bytes >= 1200, bytes, netError: false };
  } catch {
    return { ok: false, bytes: 0, netError: true };
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

  const dbg: Record<string, unknown> = {};
  let goodsNo = goodsNoParam;
  let matchedBy = goodsNoParam ? "param" : "";

  /**
   * status 의미
   *  found     : 책등 이미지를 찾음
   *  no-spine  : 상품은 찾았지만 이 책에 책등 이미지가 없음 (확정 → 재조회 불필요)
   *  not-found : 검색 결과에 이 책이 없음 (확정 → 재조회 불필요)
   *  error     : 통신 실패/타임아웃 (일시적 → 다음에 재시도)
   */
  const reply = (
    status: "found" | "no-spine" | "not-found" | "error",
    body: Record<string, unknown>
  ) => {
    if (status === "error") {
      // 일시적 실패는 캐시하지 않는다 (엣지 캐시에 30일 남으면 영구 실패가 됨)
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader("Cache-Control", "public, s-maxage=2592000, stale-while-revalidate=2592000");
    }
    res.status(200).json({ status, ...body, ...(debug ? { debug: dbg } : {}) });
  };

  try {
    let netError = false;

    // 1) ISBN 검색 — ISBN 은 고유하므로 첫 결과를 신뢰
    if (!goodsNo && isbn) {
      const r = await searchGoodsNos(isbn);
      dbg.isbnSearch = { status: r.status, len: r.len, nos: r.nos, netError: r.netError };
      if (r.netError) netError = true;
      if (r.nos.length) {
        goodsNo = r.nos[0];
        matchedBy = "isbn";
      }
    }

    // 2) 제목 검색 — ISBN 이 있으면 상세 페이지로 검증, 없으면 첫 결과
    if (!goodsNo && title) {
      const r = await searchGoodsNos(title);
      dbg.titleSearch = { status: r.status, len: r.len, nos: r.nos, netError: r.netError };
      if (r.netError) netError = true;
      if (r.nos.length) {
        if (isbn) {
          for (const no of r.nos.slice(0, 3)) {
            if (await productHasIsbn(no, isbn)) {
              goodsNo = no;
              matchedBy = "title+isbn-verified";
              break;
            }
          }
        }
        if (!goodsNo) {
          goodsNo = r.nos[0];
          matchedBy = isbn ? "title-first(unverified)" : "title-first";
        }
      }
    }

    if (!goodsNo) {
      // 통신이 실패했으면 '없음'으로 단정하지 않는다
      if (netError) {
        reply("error", {
          spineUrl: null,
          reason: "YES24 연결에 실패했어요. 잠시 후 다시 시도합니다.",
        });
      } else {
        reply("not-found", {
          spineUrl: null,
          reason: "YES24 검색 결과에서 이 책을 찾지 못했어요.",
        });
      }
      return;
    }

    const spineUrl = `https://image.yes24.com/goods/${goodsNo}/SIDE/XL`;
    const check = await spineExists(spineUrl);
    dbg.spine = { bytes: check.bytes, netError: check.netError };

    if (check.ok) {
      reply("found", { spineUrl, goodsNo, matchedBy });
    } else if (check.netError) {
      reply("error", {
        spineUrl: null,
        goodsNo,
        matchedBy,
        reason: "책등 이미지 확인에 실패했어요. 잠시 후 다시 시도합니다.",
      });
    } else {
      reply("no-spine", {
        spineUrl: null,
        goodsNo,
        matchedBy,
        reason: "이 책은 책등 이미지가 제공되지 않아요.",
      });
    }
  } catch (err: any) {
    reply("error", { spineUrl: null, reason: String(err?.message ?? err) });
  }
}
