import { Link } from "react-router-dom";
import type { Book } from "../../types";
import { getDailyRecommendations, type BookRec } from "../../lib/recommendations";

interface TwoShelfCaseProps {
  recentBooks: Book[];
  allBooks: Book[];
}

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 실제 하드커버 도서 톤 (배경색 + 글자색) */
const SPINE_STYLES: { bg: string; fg: string }[] = [
  { bg: "#1c2340", fg: "#e5dcbf" },
  { bg: "#e8dcb5", fg: "#2a2620" },
  { bg: "#7f8a99", fg: "#f4f0e5" },
  { bg: "#1a1a1a", fg: "#e5dcbf" },
  { bg: "#eae4d0", fg: "#2a2620" },
  { bg: "#3a4258", fg: "#e5dcbf" },
  { bg: "#b09779", fg: "#2a2620" },
  { bg: "#2c3a30", fg: "#e5dcbf" },
];

// 이미지의 슬롯 내부 좌표(백분율) — bookshelf.jpg 기준으로 튜닝됨
const LEFT_SLOT = { left: 5.5, right: 52.5, top: 6, bottom: 6.5 };
const RIGHT_SLOT = { left: 52.5, right: 5.5, top: 6, bottom: 6.5 };

// 슬롯 내부에 그리는 실제 원목 백월(painted books 위를 덮어 실제 데이터를 노출)
const BACK_WALL_BG =
  "linear-gradient(180deg, #6b4620 0%, #a67640 12%, #b58652 50%, #a06f3a 88%, #653f18 100%)";
const BACK_WALL_SHADOW =
  "inset 0 8px 14px -6px rgba(0,0,0,0.6), inset 0 -6px 10px -5px rgba(0,0,0,0.45), inset 4px 0 8px -6px rgba(0,0,0,0.35), inset -4px 0 8px -6px rgba(0,0,0,0.35)";

function SpineFromBook({ book }: { book: Book }) {
  const h = stableHash(book.id);
  const style = SPINE_STYLES[h % SPINE_STYLES.length];
  const width = 28 + (h % 6);
  const height = 108 - (h % 10);
  const rotate = ((h % 5) - 2) * 0.4;
  return (
    <Link
      to={`/book/${book.id}`}
      className="book-spine group flex flex-shrink-0 flex-col items-center justify-start"
      style={{
        width,
        height,
        backgroundColor: style.bg,
        color: style.fg,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "bottom center",
      }}
      title={`${book.title}${book.author ? ` — ${book.author}` : ""}`}
    >
      <span className="book-spine-title">{book.title}</span>
      {book.author && <span className="book-spine-author">{book.author}</span>}
    </Link>
  );
}

function SpineFromRec({ rec, idx }: { rec: BookRec; idx: number }) {
  const h = stableHash(rec.title);
  const style = SPINE_STYLES[(h + idx) % SPINE_STYLES.length];
  const width = 28 + (h % 6);
  const height = 110 - (h % 10);
  const rotate = ((h % 5) - 2) * 0.4;
  return (
    <div
      className="book-spine flex flex-shrink-0 flex-col items-center justify-start"
      style={{
        width,
        height,
        backgroundColor: style.bg,
        color: style.fg,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "bottom center",
      }}
      title={`${rec.title} — ${rec.author} · ${rec.genre}`}
    >
      <span className="book-spine-title">{rec.title}</span>
      <span className="book-spine-author">{rec.author}</span>
    </div>
  );
}

export default function TwoShelfCase({ recentBooks, allBooks }: TwoShelfCaseProps) {
  const recs = getDailyRecommendations(allBooks);
  const shownRecent = recentBooks.slice(0, 5);

  return (
    <div className="mb-4">
      <div className="relative overflow-hidden rounded-md shadow-md" style={{ aspectRatio: "840 / 510" }}>
        <img src="/bookshelf.jpg" alt="원목 책장" className="absolute inset-0 h-full w-full object-cover" />

        {/* 상단 라벨 */}
        <div className="pointer-events-none absolute inset-x-0 top-1 flex justify-between px-3 text-[9px] font-semibold tracking-[0.25em] text-stone-100/80">
          <span className="rounded bg-stone-900/40 px-1.5 py-0.5">RECENTLY READ</span>
          <span className="rounded bg-stone-900/40 px-1.5 py-0.5">TODAY'S PICKS</span>
        </div>

        {/* 좌측 슬롯 — 최근 완독 책 */}
        <div
          className="absolute"
          style={{
            left: `${LEFT_SLOT.left}%`,
            right: `${LEFT_SLOT.right}%`,
            top: `${LEFT_SLOT.top}%`,
            bottom: `${LEFT_SLOT.bottom}%`,
            background: BACK_WALL_BG,
            boxShadow: BACK_WALL_SHADOW,
          }}
        >
          <div className="absolute inset-x-1 bottom-[3%] flex items-end justify-start gap-[2px] overflow-hidden">
            {shownRecent.length > 0 ? (
              shownRecent.map((b) => <SpineFromBook key={b.id} book={b} />)
            ) : (
              <p className="w-full pb-2 text-center text-[10px] italic text-stone-100/70">
                아직 완독한 책이 없어요
              </p>
            )}
          </div>
        </div>

        {/* 우측 슬롯 — 오늘의 추천 */}
        <div
          className="absolute"
          style={{
            left: `${RIGHT_SLOT.left}%`,
            right: `${RIGHT_SLOT.right}%`,
            top: `${RIGHT_SLOT.top}%`,
            bottom: `${RIGHT_SLOT.bottom}%`,
            background: BACK_WALL_BG,
            boxShadow: BACK_WALL_SHADOW,
          }}
        >
          <div className="absolute inset-x-1 bottom-[3%] flex items-end justify-start gap-[2px] overflow-hidden">
            {recs.map((r, i) => (
              <SpineFromRec key={`${r.title}-${i}`} rec={r} idx={i} />
            ))}
          </div>
        </div>
      </div>

      {/* 이미지에 다 담지 못한 완독 책 안내 */}
      {recentBooks.length > 5 && (
        <p className="mt-1 text-right text-[10px] italic text-stone-500">
          최근 완독 외 {recentBooks.length - 5}권 더
        </p>
      )}
    </div>
  );
}
