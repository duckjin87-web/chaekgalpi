/**
 * Vercel 서버리스 함수: 도서 검색/조회 프록시.
 *
 * 우선순위: 알라딘(국내 도서 정보·목차 강점) → 실패 시 Google Books 폴백.
 * 정규화된 형태 { source, results: BookResult[] } 로 응답한다.
 *
 * 환경변수:
 *  - ALADIN_TTB_KEY        : 알라딘 TTB 키 (있으면 알라딘 우선 사용)
 *  - GOOGLE_BOOKS_API_KEY  : (선택) Google Books 키 — 폴백 안정화용
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

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
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
  const common = `ttbkey=${params.ttbkey}&output=js&Version=20131101&Cover=Big&SearchTarget=Book`;
  let url: string;
  if (params.isbn) {
    url =
      `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?${common}` +
      `&itemIdType=ISBN13&ItemId=${encodeURIComponent(params.isbn)}&OptResult=Toc,packing`;
  } else {
    url =
      `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?${common}` +
      `&Query=${encodeURIComponent(params.q ?? "")}&QueryType=Title&MaxResults=${params.maxResults}&start=1&Sort=Accuracy`;
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Aladin HTTP ${r.status}`);
  const data = parseAladin(await r.text());
  if (data?.errorCode) throw new Error(`Aladin error ${data.errorCode}: ${data.errorMessage}`);
  const items = Array.isArray(data?.item) ? data.item : [];
  return items.map(mapAladinItem).filter((b: BookResult) => b.title);
}

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
  const r = await fetch(`https://www.googleapis.com/books/v1/volumes?${sp.toString()}`);
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

export default async function handler(req: any, res: any) {
  const q = (req.query?.q ?? "").toString().trim();
  const isbn = (req.query?.isbn ?? "").toString().replace(/[^0-9Xx]/g, "");
  const maxResults = Math.min(10, Number(req.query?.maxResults ?? 5) || 5);
  if (!q && !isbn) {
    res.status(400).json({ error: "q 또는 isbn 파라미터가 필요합니다." });
    return;
  }

  const ttbkey = process.env.ALADIN_TTB_KEY;
  const debug: Record<string, unknown> = {
    aladinKey: ttbkey ? `set(len:${ttbkey.length})` : "MISSING",
    aladinError: null,
    googleError: null,
  };
  let results: BookResult[] = [];
  let source = "";

  // 1순위: 알라딘
  if (ttbkey) {
    try {
      results = await fromAladin({ q, isbn, maxResults, ttbkey });
      if (results.length) source = "aladin";
      else debug.aladinError = "결과 0건";
    } catch (err: any) {
      debug.aladinError = String(err?.message ?? err);
    }
  }

  // 2순위: Google Books
  if (!results.length) {
    try {
      results = await fromGoogle({ q, isbn, maxResults });
      if (results.length) source = "google";
    } catch (err: any) {
      debug.googleError = String(err?.message ?? err);
      res.status(502).json({ error: "도서 검색 실패", detail: String(err?.message ?? err), debug });
      return;
    }
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).json({ source, results, debug });
}
