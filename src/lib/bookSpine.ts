/** ISBN으로 YES24 책등(SIDE) 이미지 URL 조회. 없으면 null. */
export async function fetchSpineUrl(isbn: string): Promise<string | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (!clean) return null;
  try {
    const res = await fetch(`/api/book-spine?isbn=${encodeURIComponent(clean)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { spineUrl?: string | null };
    return data.spineUrl ?? null;
  } catch {
    return null;
  }
}
