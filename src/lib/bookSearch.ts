export interface BookSearchResult {
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

interface ProxyResponse {
  source?: string;
  results?: BookSearchResult[];
}

/** 제목으로 도서 검색 (알라딘 우선, 서버에서 Google Books 폴백) */
export async function searchBooksByTitle(title: string): Promise<BookSearchResult[]> {
  const query = title.trim();
  if (!query) return [];
  const res = await fetch(`/api/book-search?q=${encodeURIComponent(query)}&maxResults=5`);
  if (!res.ok) throw new Error("도서 검색에 실패했어요.");
  const data = (await res.json()) as ProxyResponse;
  return data.results ?? [];
}

/** ISBN으로 단일 도서 상세 조회 (페이지수·목차 포함) */
export async function fetchBookByIsbn(isbn: string): Promise<BookSearchResult | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (!clean) return null;
  const res = await fetch(`/api/book-search?isbn=${encodeURIComponent(clean)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as ProxyResponse;
  return data.results?.[0] ?? null;
}
