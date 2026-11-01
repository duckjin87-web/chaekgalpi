/**
 * Vercel 서버리스 함수: 도서 검색/조회 프록시.
 *
 * 제목 검색: 알라딘 · Google Books · YES24 를 동시에 조회하고 우선순위대로 고른다.
 *   1) 알라딘   — 국내 도서 정보·목차·페이지수 강점 (ALADIN_TTB_KEY 필요)
 *   2) Google   — 키가 없으면 공용 할당량을 쓰는데, 거의 항상 소진(429)되어 있다
 *   3) YES24    — 키 없이 동작하는 최후 보루 (모바일 검색 JSON + 상품 상세)
 * ISBN 조회: 알라딘 → Google 순서.
 *
 * 정규화된 형태 { source, results: BookResult[], debug } 로 응답한다.
 * 결과가 없거나 실패한 응답은 캐시하지 않는다 (일시 장애가 하루 동안 굳지 않도록).
 *
 * 환경변수:
 *  - ALADIN_TTB_KEY        : 알라딘 TTB 키 (강력 권장)
 *  - GOOGLE_BOOKS_API_KEY  : (선택) Google Books 키 — 있으면 할당량 문제 없음
 *
 * 사용:
 *  - 제목 검색:  /api/book-search?q=편안함의 습격
 *  - ISBN 조회:  /api/book-search?isbn=9791155811234   (목차·페이지수 포함)
 */

interface BookResult {
  title: string;
  author: string;
  coverUrl?: string;
  pageCount?: number;
  description?: string;
  categories?: string[];
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  toc?: string[];
}

const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** 타임아웃이 있는 fetch — 한 곳이 멈춰도 전체 검색이 함수 제한시간에 걸리지 않게 */
async function fetchWithTimeout(url: string, ms: number, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error(`timeout ${ms}ms`);
    throw err;
  } finally {
    clearTimeout(t);
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseToc(tocHtml?: string): string[] | undefined {
  if (!tocHtml) return undefined;
  const lines = stripTags(tocHtml)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : undefined;
}

function categoriesFrom(categoryName?: string): string[] | undefined {
  if (!categoryName) return undefined;
  const parts = categoryName
    .split(">")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? Array.from(new Set(parts)) : undefined;
}

/* ------------------------------------------------------------------ */
/* 알라딘                                                              */
/* ------------------------------------------------------------------ */

function mapAladinItem(item: any): BookResult {
  const sub = item?.subInfo ?? {};
  return {
    title: (item?.title ?? "").replace(/\s*-\s*.*$/, "").trim() || item?.title || "",
    author: item?.author ?? "",
    coverUrl: item?.cover?.replace("http://", "https://") || undefined,
    pageCount: typeof sub.itemPage === "number" && sub.itemPage > 0 ? sub.itemPage : undefined,
    description: item?.description ? stripTags(item.description) : undefined,
    categories: categoriesFrom(item?.categoryName),
    isbn: item?.isbn13 || item?.isbn || undefined,
    publisher: item?.publisher || undefined,
    publishedDate: item?.pubDate || undefined,
    toc: parseToc(sub.toc),
  };
}

function parseAladin(text: string): any {
  // output=js 는 JSON을 반환하지만 BOM/세미콜론/콜백이 붙는 경우가 있어 방어적으로 파싱
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("Aladin 응답 파싱 실패");
  }
}

async function fromAladin(params: {
  q?: string;
  isbn?: string;
  maxResults: number;
  ttbkey: string;
}): Promise<BookResult[]> {
  const common = `ttbkey=${encodeURIComponent(params.ttbkey)}&output=js&Version=20131101&Cover=Big&SearchTarget=Book`;
  let url: string;
  if (params.isbn) {
    url =
      `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?${common}` +
      `&itemIdType=ISBN13&ItemId=${encodeURIComponent(params.isbn)}&OptResult=Toc,packing`;
  } else {
    // Title 은 띄어쓰기·부제가 조금만 달라도 0건이 나와서 Keyword(제목+저자)로 찾는다
    url =
      `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?${common}` +
      `&Query=${encodeURIComponent(params.q ?? "")}&QueryType=Keyword&MaxResults=${params.maxResults}&start=1&Sort=Accuracy`;
  }
  const r = await fetchWithTimeout(url, 5000);
  if (!r.ok) throw new Error(`Aladin HTTP ${r.status}`);
  const data = parseAladin(await r.text());
  if (data?.errorCode) throw new Error(`Aladin error ${data.errorCode}: ${data.errorMessage}`);
  const items = Array.isArray(data?.item) ? data.item : [];
  return items.map(mapAladinItem).filter((b: BookResult) => b.title);
}

/* ------------------------------------------------------------------ */
/* Google Books                                                        */
/* ------------------------------------------------------------------ */

function pickIsbn(ids?: any[]): string | undefined {
  if (!ids) return undefined;
  return (
    ids.find((i) => i.type === "ISBN_13")?.identifier ??
    ids.find((i) => i.type === "ISBN_10")?.identifier
  );
}

async function fromGoogle(params: {
  q?: string;
  isbn?: string;
  maxResults: number;
}): Promise<BookResult[]> {
  const query = params.isbn ? `isbn:${params.isbn}` : params.q ?? "";
  const sp = new URLSearchParams({
    q: query,
    maxResults: String(params.maxResults),
    country: "KR",
  });
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (key) sp.set("key", key);
  const r = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?${sp}`, 5000);
  if (r.status === 429) throw new Error(key ? "Google 할당량 초과" : "Google 공용 할당량 소진(키 없음)");
  if (!r.ok) throw new Error(`Google HTTP ${r.status}`);
  const data = await r.json();
  return ((data.items ?? []) as any[])
    .filter((it) => it?.volumeInfo?.title)
    .map((it) => {
      const v = it.volumeInfo;
      return {
        title: v.title,
        author: (v.authors ?? []).join(", "),
        coverUrl: v.imageLinks?.thumbnail?.replace("http://", "https://"),
        pageCount: v.pageCount,
        description: v.description,
        categories: v.categories,
        isbn: pickIsbn(v.industryIdentifiers),
        publisher: v.publisher,
        publishedDate: v.publishedDate,
      } as BookResult;
    });
}

/* ------------------------------------------------------------------ */
/* YES24 (키 없이 동작)                                                */
/* ------------------------------------------------------------------ */

const YES24_HEADERS = {
  "User-Agent": UA_MOBILE,
  "Accept-Language": "ko-KR,ko;q=0.9",
  Referer: "https://m.yes24.com/",
};

/** 검색 결과 목록에서 상품번호 후보 */
async function yes24GoodsNos(q: string, limit: number): Promise<string[]> {
  const r = await fetchWithTimeout(
    `https://m.yes24.com/Search/SearchContentsJson?query=${encodeURIComponent(q)}`,
    5000,
    {
      headers: {
        ...YES24_HEADERS,
        Accept: "application/json, text/javascript, */*",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );
  if (!r.ok) throw new Error(`YES24 HTTP ${r.status}`);
  const text = await r.text();
  let listHtml = text;
  try {
    listHtml = (JSON.parse(text) as { listHtml?: string }).listHtml ?? "";
  } catch {
    /* JSON 이 아니면 원문에서라도 시도 */
  }
  const out: string[] = [];
  const re = /\/goods\/detail\/(\d{4,12})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(listHtml)) !== null && out.length < limit) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

function metaContent(html: string, prop: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']` +
      `|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
    "i"
  );
  const m = html.match(re);
  const v = m?.[1] ?? m?.[2];
  return v ? stripTags(v) : undefined;
}

/** 상품 상세 페이지에서 제목·저자·ISBN 추출 (표준 메타태그 위주) */
async function yes24Detail(goodsNo: string): Promise<BookResult | null> {
  const r = await fetchWithTimeout(`https://m.yes24.com/goods/detail/${goodsNo}`, 4000, {
    headers: { ...YES24_HEADERS, Accept: "text/html" },
  });
  if (!r.ok) return null;
  const html = await r.text();

  const rawTitle = metaContent(html, "og:title") ?? html.match(/<title>([^<]*)<\/title>/i)?.[1];
  if (!rawTitle) return null;
  const title = stripTags(rawTitle)
    .replace(/\s*[-|:]\s*(예스24|YES24).*$/i, "")
    .replace(/^\[[^\]]*\]\s*/, "") // [도서] 같은 말머리 제거
    .trim();
  if (!title) return null;

  const text = stripTags(html.replace(/<script[\s\S]*?<\/script>/gi, " ")).replace(/\s+/g, " ");
  const author =
    metaContent(html, "author") ??
    text.match(/(?:저자|지은이)\s*[:：]?\s*([^|·,\n]{1,40}?)\s*(?:저|지음|글|\||출판사|$)/)?.[1]?.trim() ??
    "";
  const publisher = text.match(/출판사\s*[:：]?\s*([^|·,\n]{1,30}?)\s*(?:\||발행|출간|$)/)?.[1]?.trim();
  const isbn = html.match(/97[89]\d{10}/)?.[0];
  const pageMatch = text.match(/(\d{2,4})\s*쪽/);

  return {
    title,
    author,
    coverUrl: `https://image.yes24.com/goods/${goodsNo}/XL`,
    isbn,
    publisher: publisher || undefined,
    pageCount: pageMatch ? Number(pageMatch[1]) : undefined,
    description: metaContent(html, "og:description"),
  };
}

async function fromYes24Details(nos: string[]): Promise<BookResult[]> {
  const settled = await Promise.allSettled(nos.map(yes24Detail));
  return settled
    .map((s) => (s.status === "fulfilled" ? s.value : null))
    .filter((b): b is BookResult => Boolean(b));
}

/* ------------------------------------------------------------------ */

function errMsg(err: any) {
  return String(err?.message ?? err);
}

export default async function handler(req: any, res: any) {
  const q = (req.query?.q ?? "").toString().trim();
  const isbn = (req.query?.isbn ?? "").toString().replace(/[^0-9Xx]/g, "");
  const maxResults = Math.min(10, Number(req.query?.maxResults ?? 5) || 5);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!q && !isbn) {
    res.status(400).json({ error: "q 또는 isbn 파라미터가 필요합니다." });
    return;
  }

  const ttbkey = process.env.ALADIN_TTB_KEY;
  const debug: Record<string, unknown> = {
    aladinKey: ttbkey ? `set(len:${ttbkey.length})` : "MISSING",
    googleKey: process.env.GOOGLE_BOOKS_API_KEY ? "set" : "MISSING",
  };

  // 세 곳을 동시에 조회 — 순차로 하면 앞의 실패/지연이 그대로 누적된다
  const aladinP = ttbkey
    ? fromAladin({ q, isbn, maxResults, ttbkey })
    : Promise.reject(new Error("ALADIN_TTB_KEY 없음"));
  const googleP = fromGoogle({ q, isbn, maxResults });
  const yes24P = isbn ? Promise.resolve<string[]>([]) : yes24GoodsNos(q, maxResults);

  const [aladin, google, yes24] = await Promise.allSettled([aladinP, googleP, yes24P]);

  let results: BookResult[] = [];
  let source = "";
  let failures = 0;

  if (aladin.status === "fulfilled") {
    debug.aladin = `${aladin.value.length}건`;
    if (aladin.value.length) {
      results = aladin.value;
      source = "aladin";
    }
  } else {
    failures += 1;
    debug.aladin = errMsg(aladin.reason);
  }

  if (google.status === "fulfilled") {
    debug.google = `${google.value.length}건`;
    if (!results.length && google.value.length) {
      results = google.value;
      source = "google";
    }
  } else {
    failures += 1;
    debug.google = errMsg(google.reason);
  }

  if (!isbn) {
    if (yes24.status === "fulfilled") {
      debug.yes24 = `${yes24.value.length}건`;
      if (!results.length && yes24.value.length) {
        try {
          results = await fromYes24Details(yes24.value);
          if (results.length) source = "yes24";
          else debug.yes24 = "상세 파싱 0건";
        } catch (err) {
          debug.yes24 = errMsg(err);
        }
      }
    } else {
      failures += 1;
      debug.yes24 = errMsg(yes24.reason);
    }
  }

  const providers = isbn ? 2 : 3;
  if (!results.length && failures === providers) {
    // 전부 통신 실패 — '결과 없음'과 구분해서 알린다
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "도서 검색 서버에 연결하지 못했어요.", source, results, debug });
    return;
  }

  // 결과가 있을 때만 캐시. 0건은 일시 장애일 수 있어 캐시하지 않는다.
  res.setHeader(
    "Cache-Control",
    results.length ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store"
  );
  res.status(200).json({ source, results, debug });
}
