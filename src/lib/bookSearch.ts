export interface BookSearchResult {
  title: string;
  author: string;
  coverUrl?: string;
  pageCount?: number;
  description?: string;
  categories?: string[];
}

export async function searchBooksByTitle(title: string): Promise<BookSearchResult[]> {
  const query = title.trim();
  if (!query) return [];

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    `intitle:${query}`
  )}&maxResults=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("도서 검색에 실패했어요.");
  const data = await res.json();

  type VolumeItem = {
    volumeInfo?: {
      title?: string;
      authors?: string[];
      pageCount?: number;
      description?: string;
      categories?: string[];
      imageLinks?: { thumbnail?: string };
    };
  };

  return ((data.items ?? []) as VolumeItem[])
    .filter((item) => item.volumeInfo?.title)
    .map((item) => ({
      title: item.volumeInfo!.title!,
      author: item.volumeInfo!.authors?.join(", ") ?? "",
      coverUrl: item.volumeInfo!.imageLinks?.thumbnail,
      pageCount: item.volumeInfo!.pageCount,
      description: item.volumeInfo!.description,
      categories: item.volumeInfo!.categories,
    }));
}
