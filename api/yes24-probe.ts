/**
 * 진단 전용: YES24 검색 API(/api/search/goods) 의 사용법을 알아낸다.
 *
 * 1) search.js / searchResult.js 에서 해당 경로 주변 코드를 그대로 떠서
 *    파라미터 이름과 호출 방식을 확인
 * 2) 후보 파라미터 조합으로 실제 호출해 응답을 확인
 *
 * 사용: /api/yes24-probe?q=브레이크넥
 */

const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

async function get(
  url: string,
  extraHeaders: Record<string, string> = {},
  timeoutMs = 9000
): Promise<{ ok: boolean; body: string; status: number; ct: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA_MOBILE,
        Accept: "application/json, text/html, */*",
        "Accept-Language": "ko-KR,ko;q=0.9",
        ...extraHeaders,
      },
    });
    const body = await r.text();
    return {
      ok: r.ok,
      body,
      status: r.status,
      ct: (r.headers.get("content-type") ?? "").slice(0, 40),
    };
  } catch (e: any) {
    return { ok: false, body: String(e?.message ?? e), status: 0, ct: "" };
  } finally {
    clearTimeout(t);
  }
}

/** 문자열 주변 코드를 떠서 파라미터 이름을 눈으로 확인 */
function contextAround(text: string, needle: string, before = 400, after = 700): string[] {
  const out: string[] = [];
  let idx = 0;
  while (out.length < 3) {
    const i = text.indexOf(needle, idx);
    if (i < 0) break;
    out.push(
      text
        .slice(Math.max(0, i - before), i + after)
        .replace(/\s+/g, " ")
    );
    idx = i + needle.length;
  }
  return out;
}

export default async function handler(req: any, res: any) {
  const q = (req.query?.q ?? "브레이크넥").toString().trim();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  const out: Record<string, unknown> = { query: q };

  try {
    // ── 1) JS 소스에서 API 사용부 코드 확보
    const jsFiles = [
      "https://image.yes24.com/static/common/search.js?v=20260409",
      "https://m.yes24.com/Scripts/Search/searchResult.js?v=202604013",
    ];
    const sources: unknown[] = [];
    for (const u of jsFiles) {
      const js = await get(u);
      if (!js.ok) {
        sources.push({ url: u, status: js.status });
        continue;
      }
      sources.push({
        url: u,
        len: js.body.length,
        aroundApiSearchGoods: contextAround(js.body, "/api/search/goods"),
        aroundContentsJson: contextAround(js.body, "SearchContentsJson"),
      });
    }
    out.jsSources = sources;

    // ── 2) 후보 파라미터 조합으로 실제 호출
    const qe = encodeURIComponent(q);
    const bases = [
      "https://m.yes24.com/api/search/goods",
      "https://www.yes24.com/api/search/goods",
      "https://m.yes24.com/Search/SearchContentsJson",
      "https://www.yes24.com/Search/SearchContentsJson",
    ];
    const paramSets = [
      `query=${qe}`,
      `query=${qe}&domain=ALL`,
      `query=${qe}&domain=BOOK&page=1&size=10`,
      `keyword=${qe}`,
      `searchWord=${qe}`,
      `query=${qe}&pageNo=1&pageSize=10`,
    ];

    const calls: unknown[] = [];
    for (const base of bases) {
      for (const ps of paramSets) {
        const url = `${base}?${ps}`;
        const r = await get(
          url,
          { "X-Requested-With": "XMLHttpRequest", Referer: "https://m.yes24.com/" },
          7000
        );
        const isJson = /json/i.test(r.ct) || /^[\s]*[[{]/.test(r.body);
        // 상품번호가 보이는지
        const goods = [
          ...new Set(
            (r.body.match(/\b(1[0-9]{8}|[89][0-9]{7})\b/g) ?? []).slice(0, 6)
          ),
        ];
        calls.push({
          url,
          status: r.status,
          ct: r.ct,
          len: r.body.length,
          isJson,
          queryInBody: r.body.includes(q),
          goodsLike: goods,
          head: r.body.slice(0, 220).replace(/\s+/g, " "),
        });
        // 뚜렷한 성공이면 조기 종료
        if (r.status === 200 && isJson && r.body.includes(q)) {
          out.winner = url;
          out.calls = calls;
          res.status(200).json(out);
          return;
        }
      }
    }
    out.calls = calls;
    res.status(200).json(out);
  } catch (err: any) {
    out.error = String(err?.message ?? err);
    res.status(200).json(out);
  }
}
