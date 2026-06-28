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
}

type IndustryIdentifier = { type?: string; identifier?: string };

function pickIsbn(ids?: IndustryIdentifier[]): string | undefined {
  if (!ids) return undefined;
  const isbn13 = ids.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10 = ids.find((i) => i.type === "ISBN_10")?.identifier;
  return isbn13 ?? isbn10;
}

type VolumeItem = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    description?: string;
    categories?: string[];
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: IndustryIdentifier[];
    imageLinks?: { thumbnail?: string };
  };
};

function mapVolume(item: VolumeItem): BookSearchResult {
  const info = item.volumeInfo!;
  return {
    title: info.title!,
    author: info.authors?.join(", ") ?? "",
    coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://"),
    pageCount: info.pageCount,
    description: info.description,
    categories: info.categories,
    isbn: pickIsbn(info.industryIdentifiers),
    publisher: info.publisher,
    publishedDate: info.publishedDate,
  };
}

function parseVolumes(data: { items?: VolumeItem[] }): BookSearchResult[] {
  return ((data.items ?? []) as VolumeItem[])
    .filter((item) => item.volumeInfo?.title)
    .map(mapVolume);
}

async function queryGoogleBooks(q: string, maxResults = 5): Promise<BookSearchResult[]> {
  // 1순위: 서버리스 프록시(/api/book-search) — 모바일 공유 IP 쿼터(429) 회피 + 키 사용
  try {
    const proxy = await fetch(
      `/api/book-search?q=${encodeURIComponent(q)}&maxResults=${maxResults}`
    );
    if (proxy.ok) {
      return parseVolumes(await proxy.json());
    }
    // 프록시가 명시적 오류를 주면(예: 미배포 404, 쿼터 429) 직접 호출로 폴백
  } catch {
    // 네트워크 오류 시에도 직접 호출로 폴백
  }

  // 2순위(폴백): 브라우저에서 직접 호출 (로컬 vite dev 또는 프록시 미가용 시)
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    q
  )}&maxResults=${maxResults}&country=KR`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("도서 검색에 실패했어요.");
  return parseVolumes(await res.json());
}

export async function searchBooksByTitle(title: string): Promise<BookSearchResult[]> {
  const query = title.trim();
  if (!query) return [];
  // 제목 우선 검색 후 결과가 없으면 일반 검색으로 폴백
  const byTitle = await queryGoogleBooks(`intitle:${query}`);
  if (byTitle.length > 0) return byTitle;
  return queryGoogleBooks(query);
}

/** ISBN으로 단일 도서 정보 조회 */
export async function searchBookByIsbn(isbn: string): Promise<BookSearchResult | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (!clean) return null;
  const results = await queryGoogleBooks(`isbn:${clean}`, 1);
  return results[0] ?? null;
}
