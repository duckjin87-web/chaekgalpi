/**
 * YES24 책등(SIDE) 이미지 URL 조회.
 * ISBN 우선, 없거나 못 찾으면 제목으로 재시도. 책등이 없으면 null.
 */
export async function fetchSpineUrl(
  isbn?: string,
  title?: string
): Promise<string | null> {
  const cleanIsbn = (isbn ?? "").replace(/[^0-9Xx]/g, "");
  const params = new URLSearchParams();
  if (cleanIsbn) params.set("isbn", cleanIsbn);
  if (title?.trim()) params.set("title", title.trim());
  if ([...params.keys()].length === 0) return null;

  try {
    const res = await fetch(`/api/book-spine?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { spineUrl?: string | null };
    return data.spineUrl ?? null;
  } catch {
    return null;
  }
}
