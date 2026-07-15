import type { Book } from "../types";

export interface BookRec {
  title: string;
  author: string;
  genre: string;
  color: string;
}

/** 장르별 큐레이션 풀 (색은 책등 표시용) */
const POOL: Record<string, BookRec[]> = {
  역사: [
    { title: "사피엔스", author: "유발 하라리", genre: "역사", color: "#8b4a3a" },
    { title: "총 균 쇠", author: "재레드 다이아몬드", genre: "역사", color: "#5a3a2a" },
    { title: "로마인 이야기", author: "시오노 나나미", genre: "역사", color: "#6b2f2a" },
    { title: "인류의 위대한 여행", author: "앨리스 로버츠", genre: "역사", color: "#7c4a2a" },
  ],
  과학: [
    { title: "코스모스", author: "칼 세이건", genre: "과학", color: "#1e3a5f" },
    { title: "이기적 유전자", author: "리처드 도킨스", genre: "과학", color: "#2a5f5a" },
    { title: "침묵의 봄", author: "레이첼 카슨", genre: "과학", color: "#3a5a3a" },
    { title: "부분과 전체", author: "베르너 하이젠베르크", genre: "과학", color: "#2a4a6a" },
    { title: "이토록 뜻밖의 뇌과학", author: "리사 펠드먼 배럿", genre: "과학", color: "#3a6a5a" },
  ],
  소설: [
    { title: "채식주의자", author: "한강", genre: "소설", color: "#4a2a4a" },
    { title: "위대한 개츠비", author: "F. 스콧 피츠제럴드", genre: "소설", color: "#2f4a6a" },
    { title: "노르웨이의 숲", author: "무라카미 하루키", genre: "소설", color: "#5a3a4a" },
    { title: "달러구트 꿈 백화점", author: "이미예", genre: "소설", color: "#6a4a7a" },
    { title: "파친코", author: "이민진", genre: "소설", color: "#4a3a5a" },
  ],
  에세이: [
    { title: "여행의 이유", author: "김영하", genre: "에세이", color: "#7a5a3a" },
    { title: "나는 나로 살기로 했다", author: "김수현", genre: "에세이", color: "#8a6a4a" },
    { title: "죽고 싶지만 떡볶이는 먹고 싶어", author: "백세희", genre: "에세이", color: "#9a5a4a" },
    { title: "무진기행", author: "김승옥", genre: "에세이", color: "#6a5a2a" },
  ],
  철학: [
    { title: "아우렐리우스 명상록", author: "마르쿠스 아우렐리우스", genre: "철학", color: "#3a3a5a" },
    { title: "정의란 무엇인가", author: "마이클 샌델", genre: "철학", color: "#2a2a4a" },
    { title: "니체의 인생 강의", author: "이진우", genre: "철학", color: "#4a3a6a" },
    { title: "죽음이란 무엇인가", author: "셸리 케이건", genre: "철학", color: "#2a3a4a" },
  ],
  자기계발: [
    { title: "아주 작은 습관의 힘", author: "제임스 클리어", genre: "자기계발", color: "#a05a3a" },
    { title: "미라클 모닝", author: "할 엘로드", genre: "자기계발", color: "#b06a4a" },
    { title: "마인드셋", author: "캐럴 드웩", genre: "자기계발", color: "#9a4a3a" },
    { title: "몰입", author: "미하이 칙센트미하이", genre: "자기계발", color: "#8a5a4a" },
  ],
  경영: [
    { title: "넛지", author: "리처드 탈러", genre: "경영", color: "#3a5a4a" },
    { title: "제로 투 원", author: "피터 틸", genre: "경영", color: "#4a6a5a" },
    { title: "부의 인문학", author: "우석", genre: "경영", color: "#4a5a3a" },
  ],
};

const GENRE_ROTATION = ["역사", "과학", "소설", "에세이", "철학", "자기계발", "경영"];

function seededPick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function daySeed(offset: number = 0): number {
  const d = new Date();
  const today = Number(
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
  );
  return today + offset;
}

/** 사용자의 책 태그·분류에서 관심 장르 추정 */
function inferUserGenres(books: Book[]): Set<string> {
  const genres = new Set<string>();
  const tags = books.flatMap((b) => b.tags.map((t) => t.trim()));
  for (const t of tags) {
    for (const g of GENRE_ROTATION) {
      if (t.includes(g) || g.includes(t)) genres.add(g);
    }
    if (/novel|소설|문학/i.test(t)) genres.add("소설");
    if (/history|역사/i.test(t)) genres.add("역사");
    if (/science|과학/i.test(t)) genres.add("과학");
    if (/essay|에세이|산문|수필/i.test(t)) genres.add("에세이");
    if (/philosophy|철학|사상/i.test(t)) genres.add("철학");
    if (/self|자기계발|habit|성공/i.test(t)) genres.add("자기계발");
    if (/business|economic|경영|경제/i.test(t)) genres.add("경영");
  }
  return genres;
}

/**
 * 오늘의 추천 5권 — 매일 바뀌지만 하루 안에는 고정.
 * 사용자의 관심 장르 2개 + 관심 밖 장르 3개(폭 넓히기)로 구성.
 */
export function getDailyRecommendations(books: Book[]): BookRec[] {
  const userTitles = new Set(books.map((b) => b.title));
  const userGenres = inferUserGenres(books);
  const preferred = GENRE_ROTATION.filter((g) => userGenres.has(g));
  const other = GENRE_ROTATION.filter((g) => !userGenres.has(g));

  // 하루 시드로 관심 장르 2개 + 그 외 3개 선정 (관심 장르가 부족하면 그 외에서 보충)
  const seed = daySeed();
  const shuffledPreferred = [...preferred].sort((a, b) => {
    const sa = (a.charCodeAt(0) + seed) % 997;
    const sb = (b.charCodeAt(0) + seed) % 997;
    return sa - sb;
  });
  const shuffledOther = [...other].sort((a, b) => {
    const sa = (a.charCodeAt(0) + seed) % 997;
    const sb = (b.charCodeAt(0) + seed) % 997;
    return sa - sb;
  });
  const chosenGenres: string[] = [];
  for (const g of shuffledPreferred.slice(0, 2)) chosenGenres.push(g);
  for (const g of shuffledOther) {
    if (chosenGenres.length >= 5) break;
    if (!chosenGenres.includes(g)) chosenGenres.push(g);
  }
  while (chosenGenres.length < 5 && shuffledPreferred.length > chosenGenres.length) {
    for (const g of shuffledPreferred) {
      if (chosenGenres.length >= 5) break;
      if (!chosenGenres.includes(g)) chosenGenres.push(g);
    }
    break;
  }

  const recs: BookRec[] = [];
  for (let i = 0; i < chosenGenres.length; i++) {
    const g = chosenGenres[i];
    const pool = POOL[g] ?? [];
    if (pool.length === 0) continue;
    // 이미 읽은 책은 피함 (가능한 범위 내에서)
    const filtered = pool.filter((b) => !userTitles.has(b.title));
    const list = filtered.length ? filtered : pool;
    recs.push(seededPick(list, seed + i));
  }
  return recs.slice(0, 5);
}
