import { Link } from "react-router-dom";
import type { Book } from "../../types";
import { getDailyRecommendations, type BookRec } from "../../lib/recommendations";

interface ThreeTierShelfProps {
  recentBooks: Book[];
  oldBooks: Book[];
  allBooks: Book[];
}

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SPINE_STYLES: { bg: string; fg: string }[] = [
  { bg: "#1c2340", fg: "#e5dcbf" },
  { bg: "#e8dcb5", fg: "#2a2620" },
  { bg: "#7f8a99", fg: "#f4f0e5" },
  { bg: "#1a1a1a", fg: "#e5dcbf" },
  { bg: "#eae4d0", fg: "#2a2620" },
  { bg: "#3a4258", fg: "#e5dcbf" },
  { bg: "#b09779", fg: "#2a2620" },
  { bg: "#2c3a30", fg: "#e5dcbf" },
  { bg: "#6b2f2a", fg: "#e5dcbf" },
  { bg: "#4a3a5a", fg: "#e5dcbf" },
];

const SPINE_HEIGHT_PX = 140;

/** 제목 길이에 따른 책등 두께 (26~46px) */
function spineWidth(title: string): number {
  const len = Math.min(title.length, 18);
  return 26 + Math.round(len * 1.1);
}

/** 세로 텍스트를 한 줄 안에 담기 위한 폰트 크기 */
function spineFontSize(title: string): number {
  const usable = SPINE_HEIGHT_PX - 22; // 캡밴드/여백
  const perChar = usable / title.length;
  return Math.max(8, Math.min(13, Math.round(perChar / 1.05)));
}

function BookSpineFromBook({ book }: { book: Book }) {
  const h = stableHash(book.id);
  const style = SPINE_STYLES[h % SPINE_STYLES.length];
  const width = spineWidth(book.title);
  const fontSize = spineFontSize(book.title);
  const rotate = ((h % 5) - 2) * 0.35;

  return (
    <Link
      to={`/book/${book.id}`}
      className="book-spine group flex flex-shrink-0 flex-col items-center justify-start transition-transform hover:-translate-y-1"
      style={{
        width,
        height: SPINE_HEIGHT_PX,
        backgroundColor: style.bg,
        color: style.fg,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "bottom center",
      }}
      title={`${book.title}${book.author ? ` — ${book.author}` : ""}`}
    >
      <span className="book-spine-title" style={{ fontSize }}>
        {book.title}
      </span>
    </Link>
  );
}

function BookSpineFromRec({ rec, idx }: { rec: BookRec; idx: number }) {
  const h = stableHash(rec.title);
  const style = SPINE_STYLES[(h + idx) % SPINE_STYLES.length];
  const width = spineWidth(rec.title);
  const fontSize = spineFontSize(rec.title);
  const rotate = ((h % 5) - 2) * 0.35;

  return (
    <div
      className="book-spine flex flex-shrink-0 flex-col items-center justify-start"
      style={{
        width,
        height: SPINE_HEIGHT_PX,
        backgroundColor: style.bg,
        color: style.fg,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "bottom center",
      }}
      title={`${rec.title} — ${rec.author} · ${rec.genre}`}
    >
      <span className="book-spine-title" style={{ fontSize }}>
        {rec.title}
      </span>
    </div>
  );
}

interface TierProps {
  label: string;
  children: React.ReactNode;
}
function Tier({ label, children }: TierProps) {
  return (
    <div className="wood-panel relative">
      <div className="flex h-[172px] items-end gap-[3px] overflow-x-auto overflow-y-hidden px-3 pb-[10px] pt-1">
        {children}
      </div>
      <span className="wood-label pointer-events-none absolute left-2 top-1">{label}</span>
      <div className="wood-plank absolute inset-x-1 bottom-0 h-[8px]" />
    </div>
  );
}

export default function ThreeTierShelf({ recentBooks, oldBooks, allBooks }: ThreeTierShelfProps) {
  const recs = getDailyRecommendations(allBooks);

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline gap-2 px-1">
        <h2 className="font-serif text-base font-bold text-ink">나의 서재 · 3단 책장</h2>
        <span className="text-[9px] tracking-[0.25em] text-stone-400">LIBRARY SHELF</span>
      </div>

      <div className="wood-frame overflow-hidden rounded-md p-2">
        <div className="flex flex-col gap-1">
          <Tier label="1단 · 읽은 책 (~6개월)">
            {recentBooks.length > 0 ? (
              recentBooks.map((b) => <BookSpineFromBook key={b.id} book={b} />)
            ) : (
              <p className="w-full py-6 text-center text-[11px] italic text-stone-100/60">
                최근 6개월 안에 완독한 책이 없어요
              </p>
            )}
          </Tier>

          <Tier label="2단 · 추천 책">
            {recs.map((r, i) => (
              <BookSpineFromRec key={`${r.title}-${i}`} rec={r} idx={i} />
            ))}
          </Tier>

          <Tier label="3단 · 이전에 읽은 책 (6개월+)">
            {oldBooks.length > 0 ? (
              oldBooks.map((b) => <BookSpineFromBook key={b.id} book={b} />)
            ) : (
              <p className="w-full py-6 text-center text-[11px] italic text-stone-100/60">
                6개월 이상 지난 완독 책이 없어요
              </p>
            )}
          </Tier>
        </div>
      </div>
    </section>
  );
}
