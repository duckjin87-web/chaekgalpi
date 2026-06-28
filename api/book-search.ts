/**
 * Vercel 서버리스 함수: Google Books 도서 검색 프록시.
 *
 * 왜 서버에서 호출하나?
 * - 브라우저(특히 모바일 통신사 공유 IP)에서 직접 호출하면 Google Books의
 *   "IP당 일일 쿼터"를 다른 사용자와 공유해 429(검색 실패)가 잦다.
 * - 서버에서 호출하면 Vercel IP를 쓰고, GOOGLE_BOOKS_API_KEY가 있으면
 *   쿼터가 "키(프로젝트)당"으로 바뀌어 문제가 사라진다.
 *
 * 환경변수(선택): GOOGLE_BOOKS_API_KEY  (없어도 동작하나 키가 있으면 안정적)
 */

export default async function handler(req: any, res: any) {
  const q = (req.query?.q ?? "").toString().trim();
  const maxResults = (req.query?.maxResults ?? "5").toString();
  if (!q) {
    res.status(400).json({ error: "q 파라미터가 필요합니다." });
    return;
  }

  const params = new URLSearchParams({ q, maxResults, country: "KR" });
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) params.set("key", apiKey);

  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
    const text = await r.text();
    if (!r.ok) {
      res.status(r.status).json({ error: "Google Books 호출 실패", status: r.status, detail: text.slice(0, 500) });
      return;
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    // 캐시: 같은 검색어는 1일간 엣지/CDN 캐시로 쿼터 절약
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).send(text);
  } catch (err: any) {
    res.status(500).json({ error: "서버 오류", detail: String(err?.message ?? err) });
  }
}
