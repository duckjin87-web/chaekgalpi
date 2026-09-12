import { useState } from "react";
import { Link } from "react-router-dom";
import type { Book } from "../../types";
import { getDailyRecommendations, type BookRec } from "../../lib/recommendations";

interface ThreeTierShelfProps {
  recentBooks: Book[];
  oldBooks: Book[];
  allBooks: Book[];
  onAddClick?: () => void;
}

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SPINE_STYLES: { bg: string; fg: string; accent: string }[] = [
  { bg: "#1c2340", fg: "#e5dcbf", accent: "#e91e63" },
  { bg: "#e8dcb5", fg: "#2a2620", accent: "#8b6f47" },
  { bg: "#7f8a99", fg: "#f4f0e5", accent: "#2c3a4f" },
  { bg: "#1a1a1a", fg: "#e5dcbf", accent: "#d4a017" },
  { bg: "#eae4d0", fg: "#2a2620", accent: "#c04040" },
  { bg: "#3a4258", fg: "#e5dcbf", accent: "#7fb069" },
  { bg: "#b09779", fg: "#2a2620", accent: "#5a3820" },
  { bg: "#2c3a30", fg: "#e5dcbf", accent: "#d4a017" },
  { bg: "#6b2f2a", fg: "#e5dcbf", accent: "#ecd28a" },
  { bg: "#4a3a5a", fg: "#e5dcbf", accent: "#f0a0b0" },
];

const SPINE_HEIGHT_PX = 148;
const COVER_HEIGHT_PX = 152;

function spineWidth(title: string): number {
  const len = Math.min(title.length, 20);
  return 34 + Math.round(len * 1.4); // 34~62px
}
function spineFontSize(title: string): number {
  const usable = SPINE_HEIGHT_PX - 26;
  const perChar = usable / title.length;
  return Math.max(9, Math.min(14, Math.round(perChar / 1.02)));
}

/** 실제 표지 이미지를 좁게 크롭해 '책등처럼' 보이는 스파인 */
function CoverSpine({
  book,
  interactive = true,
}: {
  book: Book;
  interactive?: boolean;
}) {
  const h = stableHash(book.id);
  const style = SPINE_STYLES[h % SPINE_STYLES.length];
  const width = spineWidth(book.title);
  const fontSize = spineFontSize(book.title);
  const rotate = ((h % 5) - 2) * 0.3;
  const hasCover = !!book.coverUrl;

  const inner = (
    <>
      {hasCover ? (
        <>
          <img
            src={book.coverUrl}
            alt=""
            className="absolute inset-0 block h-full w-full object-cover"
            style={{ objectPosition: `${20 + (h % 60)}% center` }}
          />
          {/* 좌우 3D 음영 */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.28) 0%, rgba(255,255,255,0.12) 12%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.08) 82%, rgba(0,0,0,0.35) 100%)",
            }}
          />
          {/* 상·하단 캡밴드 */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/40" />
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ backgroundColor: style.bg }} />
          <div
            className="absolute inset-x-1 top-2 h-[4px] rounded-sm"
            style={{ backgroundColor: style.accent }}
          />
          <div className="pointer-events-none absolute inset-0" style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.18) 0%, rgba(255,255,255,0.15) 12%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.10) 82%, rgba(0,0,0,0.22) 100%)",
          }}/>
          <div className="absolute inset-x-0 top-0 h-[2px] bg-black/25" />
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-black/25" />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-center"
            style={{ padding: "10px 0 0 0" }}
          >
            <span
              className="block max-h-[126px] overflow-hidden whitespace-nowrap font-serif font-bold"
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                fontSize,
                color: style.fg,
                textShadow: "0 1px 0 rgba(0,0,0,0.35)",
                lineHeight: 1.05,
                letterSpacing: "0.02em",
                wordBreak: "keep-all",
              }}
            >
              {book.title}
            </span>
          </div>
        </>
      )}
    </>
  );

  const commonClass =
    "relative flex-shrink-0 overflow-hidden rounded-[2px] transition-transform hover:-translate-y-1";
  const commonStyle: React.CSSProperties = {
    width,
    height: SPINE_HEIGHT_PX,
    transform: `rotate(${rotate}deg)`,
    transformOrigin: "bottom center",
    boxShadow:
      "inset 0 0 0 1px rgba(0,0,0,0.22), inset 2px 0 3px rgba(255,255,255,0.18), inset -2px 0 5px rgba(0,0,0,0.32), 1px 3px 4px -2px rgba(20,10,5,0.55)",
  };

  if (interactive) {
    return (
      <Link
        to={`/book/${book.id}`}
        className={commonClass}
        style={commonStyle}
        title={`${book.title}${book.author ? ` — ${book.author}` : ""}`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={commonClass} style={commonStyle} title={book.title}>
      {inner}
    </div>
  );
}

/** 추천도서 스파인 (표지 없음 → 컬러 스파인 + 세로 제목) */
function RecSpine({ rec, idx }: { rec: BookRec; idx: number }) {
  const h = stableHash(rec.title);
  const style = SPINE_STYLES[(h + idx) % SPINE_STYLES.length];
  const width = spineWidth(rec.title);
  const fontSize = spineFontSize(rec.title);
  const rotate = ((h % 5) - 2) * 0.3;

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-[2px]"
      style={{
        width,
        height: SPINE_HEIGHT_PX,
        backgroundColor: style.bg,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "bottom center",
        boxShadow:
          "inset 0 0 0 1px rgba(0,0,0,0.22), inset 2px 0 3px rgba(255,255,255,0.18), inset -2px 0 5px rgba(0,0,0,0.32), 1px 3px 4px -2px rgba(20,10,5,0.55)",
      }}
      title={`${rec.title} — ${rec.author} · ${rec.genre}`}
    >
      <div
        className="absolute inset-x-1 top-2 h-[4px] rounded-sm"
        style={{ backgroundColor: style.accent }}
      />
      <div className="pointer-events-none absolute inset-0" style={{
        background:
          "linear-gradient(90deg, rgba(0,0,0,0.18) 0%, rgba(255,255,255,0.15) 12%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.10) 82%, rgba(0,0,0,0.22) 100%)",
      }}/>
      <div className="absolute inset-x-0 top-0 h-[2px] bg-black/25" />
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-black/25" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-center pt-2.5">
        <span
          className="block max-h-[124px] overflow-hidden whitespace-nowrap font-serif font-bold"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            fontSize,
            color: style.fg,
            textShadow: "0 1px 0 rgba(0,0,0,0.35)",
            lineHeight: 1.05,
            letterSpacing: "0.02em",
            wordBreak: "keep-all",
          }}
        >
          {rec.title}
        </span>
      </div>
    </div>
  );
}

/** 표지 뷰 (책 상세 카드 스타일 미니 표지) */
function CoverCard({ book }: { book: Book }) {
  return (
    <Link
      to={`/book/${book.id}`}
      className="flex flex-shrink-0 flex-col items-center"
      style={{ width: 76 }}
      title={book.title}
    >
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt={book.title}
          className="rounded-sm object-cover shadow-md"
          style={{ width: 76, height: COVER_HEIGHT_PX }}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-sm bg-gradient-to-br from-stone-300 to-stone-400 text-lg text-white shadow-md"
          style={{ width: 76, height: COVER_HEIGHT_PX }}
        >
          <span className="px-1 text-center font-serif text-[10px]">{book.title}</span>
        </div>
      )}
    </Link>
  );
}

function EmptySlot({ number, onClick }: { number: number; onClick?: () => void }) {
  const el = (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-[2px] border-2 border-dashed border-stone-100/40 bg-white/5 text-[22px] text-stone-100/50 transition-colors hover:border-stone-100/70 hover:text-stone-100/80"
      style={{ width: 40, height: SPINE_HEIGHT_PX }}
      title={`빈 슬롯 ${number}`}
    >
      +
    </div>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="contents">
        {el}
      </button>
    );
  }
  return el;
}

interface TierProps {
  label: string;
  children: React.ReactNode;
}
function Tier({ label, children }: TierProps) {
  return (
    <div className="wood-panel relative">
      <div className="flex h-[180px] items-end gap-[2px] overflow-x-auto overflow-y-hidden px-3 pb-[10px] pt-1">
        {children}
      </div>
      <span className="wood-label pointer-events-none absolute left-2 top-1">{label}</span>
      <div className="wood-plank absolute inset-x-1 bottom-0 h-[8px]" />
    </div>
  );
}

type ViewMode = "spine" | "cover";

export default function ThreeTierShelf({
  recentBooks,
  oldBooks,
  allBooks,
  onAddClick,
}: ThreeTierShelfProps) {
  const [view, setView] = useState<ViewMode>("spine");
  const recs = getDailyRecommendations(allBooks);

  const renderBook = (book: Book) =>
    view === "cover" ? (
      <CoverCard key={book.id} book={book} />
    ) : (
      <CoverSpine key={book.id} book={book} />
    );

  const fillEmpty = (existingCount: number, target: number, startNum: number) => {
    if (existingCount >= target) return null;
    return Array.from({ length: target - existingCount }, (_, i) => (
      <EmptySlot key={`e-${startNum + i}`} number={startNum + i} onClick={onAddClick} />
    ));
  };

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2">
          <h2 className="font-serif text-base font-bold text-ink">나의 서재 · 3단 책장</h2>
          <span className="text-[9px] tracking-[0.25em] text-stone-400">LIBRARY SHELF</span>
        </div>
        {/* 뷰 토글 */}
        <div className="flex items-center gap-1 rounded-full border border-stone-300 bg-white/70 p-0.5 text-[11px] shadow-sm">
          <button
            onClick={() => setView("cover")}
            className={`rounded-full px-2.5 py-1 tracking-wide transition-colors ${
              view === "cover" ? "bg-ink text-white" : "text-stone-500"
            }`}
          >
            📖 책표지
          </button>
          <button
            onClick={() => setView("spine")}
            className={`rounded-full px-2.5 py-1 tracking-wide transition-colors ${
              view === "spine" ? "bg-ink text-white" : "text-stone-500"
            }`}
          >
            📚 책등
          </button>
        </div>
      </div>

      <div className="wood-frame overflow-hidden rounded-md p-2">
        <div className="flex flex-col gap-1">
          <Tier label="1단 · 읽은 책 (~6개월)">
            {recentBooks.length > 0
              ? recentBooks.map(renderBook)
              : null}
            {fillEmpty(recentBooks.length, 6, recentBooks.length + 1)}
          </Tier>

          <Tier label="2단 · 추천 책">
            {view === "cover"
              ? // 표지 없음 → 카드 자리에 임시 커버 대체
                recs.map((r, i) => (
                  <div
                    key={`${r.title}-${i}`}
                    className="flex flex-shrink-0 flex-col items-center"
                    style={{ width: 76 }}
                    title={r.title}
                  >
                    <div
                      className="flex items-center justify-center rounded-sm text-white shadow-md"
                      style={{
                        width: 76,
                        height: COVER_HEIGHT_PX,
                        backgroundColor:
                          SPINE_STYLES[(stableHash(r.title) + i) % SPINE_STYLES.length].bg,
                      }}
                    >
                      <span className="px-1 text-center font-serif text-[10px]">{r.title}</span>
                    </div>
                  </div>
                ))
              : recs.map((r, i) => <RecSpine key={`${r.title}-${i}`} rec={r} idx={i} />)}
          </Tier>

          <Tier label="3단 · 이전에 읽은 책 (6개월+)">
            {oldBooks.length > 0
              ? oldBooks.map(renderBook)
              : null}
            {fillEmpty(oldBooks.length, 6, oldBooks.length + 1)}
          </Tier>
        </div>
      </div>
    </section>
  );
}
