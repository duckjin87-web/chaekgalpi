/**
 * 진단 전용: YES24 검색의 실제 데이터 경로를 찾는다.
 *
 * 1) 검색 페이지 HTML 에서 검색어가 여러 표현(원문 / \uXXXX 이스케이프 /
 *    HTML 엔티티 / URL 인코딩)으로 들어있는지 확인.
 *    → 이스케이프 형태로 있으면 결과가 이미 HTML 안에 있다는 뜻.
 * 2) HTML 에서 <script src> 를 모아 JS 번들을 내려받고,
 *    검색 API 로 보이는 경로 문자열을 추출.
 *    → 실제 엔드포인트를 찾으면 자동 조회를 되살릴 수 있다.
 *
 * 사용: /api/yes24-probe?q=브레이크넥
 */

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

async function get(url: string, timeoutMs = 9000): Promise<{ ok: boolean; body: string; status: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/json,*/*",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    const body = r.ok ? await r.text() : "";
    return { ok: r.ok, body, status: r.status };
  } catch {
    return { ok: false, body: "", status: 0 };
  } finally {
    clearTimeout(t);
  }
}

/** 검색어의 여러 표현형 */
function queryForms(q: string): Record<string, string> {
  const uEsc = Array.from(q)
    .map((c) => "\\u" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"))
    .join("");
  const uEscLower = uEsc.toLowerCase();
  const htmlDec = Array.from(q)
    .map((c) => `&#${c.charCodeAt(0)};`)
    .join("");
  const htmlHex = Array.from(q)
    .map((c) => `&#x${c.charCodeAt(0).toString(16)};`)
    .join("");
  return {
    raw: q,
    unicodeEscapeUpper: uEsc,
    unicodeEscapeLower: uEscLower,
    htmlDecimal: htmlDec,
    htmlHex: htmlHex,
    urlEncoded: encodeURIComponent(q),
  };
}

/** JS/HTML 텍스트에서 검색 API 로 보이는 경로 추출 */
function extractApiPaths(text: string): string[] {
  const hits = new Set<string>();
  const res: RegExp[] = [
    // 절대/상대 경로 문자열 중 search 관련
    /["'`](\/[A-Za-z0-9_\-./]*[Ss]earch[A-Za-z0-9_\-./]*)["'`]/g,
    /["'`](https?:\/\/[A-Za-z0-9_\-.]*yes24[A-Za-z0-9_\-./]*[Ss]earch[A-Za-z0-9_\-./]*)["'`]/g,
    // goods 목록 관련
    /["'`](\/[A-Za-z0-9_\-./]*[Gg]oods[Ll]ist[A-Za-z0-9_\-./]*)["'`]/g,
    /["'`](\/[A-Za-z0-9_\-./]*get[A-Za-z0-9_\-./]*[Ll]ist[A-Za-z0-9_\-./]*)["'`]/g,
    // api 경로
    /["'`](\/api\/[A-Za-z0-9_\-./]+)["'`]/g,
  ];
  for (const re of res) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const v = m[1];
      if (v.length < 200) hits.add(v);
      if (hits.size > 80) return [...hits];
    }
  }
  return [...hits];
}

export default async function handler(req: any, res: any) {
  const q = (req.query?.q ?? "브레이크넥").toString().trim();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const out: Record<string, unknown> = { query: q };

  try {
    // ── 1) 검색 페이지에서 검색어 표현형 탐지
    const searchUrl = `https://m.yes24.com/search?domain=ALL&query=${encodeURIComponent(q)}`;
    const page = await get(searchUrl);
    const forms = queryForms(q);
    const formHits: Record<string, boolean> = {};
    for (const [name, val] of Object.entries(forms)) {
      formHits[name] = page.body.includes(val);
    }
    out.searchPage = {
      url: searchUrl,
      status: page.status,
      len: page.body.length,
      queryFormsFound: formHits,
      // JSON 데이터 블록 흔적
      hasNextData: page.body.includes("__NEXT_DATA__"),
      hasNuxt: page.body.includes("__NUXT__"),
      jsonScriptCount: (page.body.match(/<script[^>]+type=["']application\/json["']/gi) ?? []).length,
    };

    // ── 2) 스크립트 목록 수집
    const srcs: string[] = [];
    const reSrc = /<script[^>]+src=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = reSrc.exec(page.body)) !== null) {
      let u = m[1];
      if (u.startsWith("//")) u = "https:" + u;
      else if (u.startsWith("/")) u = "https://m.yes24.com" + u;
      if (/^https?:/.test(u)) srcs.push(u);
    }
    out.scriptCount = srcs.length;

    // 검색 관련 이름을 우선, 그 외는 뒤에
    const ranked = [
      ...srcs.filter((u) => /search|list|goods/i.test(u)),
      ...srcs.filter((u) => !/search|list|goods/i.test(u)),
    ];

    // ── 3) HTML 인라인 + 상위 JS 번들에서 API 경로 추출
    const apiFromHtml = extractApiPaths(page.body);
    const jsReports: unknown[] = [];
    const apiAll = new Set<string>(apiFromHtml);

    for (const u of ranked.slice(0, 6)) {
      const js = await get(u, 9000);
      if (!js.ok) {
        jsReports.push({ url: u, status: js.status });
        continue;
      }
      const paths = extractApiPaths(js.body);
      paths.forEach((p) => apiAll.add(p));
      jsReports.push({ url: u, len: js.body.length, found: paths.slice(0, 20) });
    }

    out.apiFromHtml = apiFromHtml.slice(0, 30);
    out.jsBundles = jsReports;
    out.apiCandidates = [...apiAll].slice(0, 60);

    res.status(200).json(out);
  } catch (err: any) {
    out.error = String(err?.message ?? err);
    res.status(200).json(out);
  }
}
