import type { Book } from "../../types";
import BookSpine from "./BookSpine";
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

const REC_STYLES: { bg: string; fg: string }[] = [
  { bg: "#1c2340", fg: "#e5dcbf" },
  { bg: "#e8dcb5", fg: "#2a2620" },
  { bg: "#7f8a99", fg: "#f4f0e5" },
  { bg: "#1a1a1a", fg: "#e5dcbf" },
  { bg: "#eae4d0", fg: "#2a2620" },
  { bg: "#3a4258", fg: "#e5dcbf" },
  { bg: "#b09779", fg: "#2a2620" },
  { bg: "#2c3a30", fg: "#e5dcbf" },
];

function RecommendedSpine({ rec, idx }: { rec: BookRec; idx: number }) {
  const h = stableHash(rec.title);
  const style = REC_STYLES[(h + idx) % REC_STYLES.length];
  const width = 28 + (h % 5);
  const height = 122 - (h % 8);
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

  return (
    <div className="mb-4">
      {/* 원목 프레임 — 두꺼운 상판/좌우측판 */}
      <div className="wood-frame relative rounded-md p-2">
        {/* 상단 라벨 */}
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="wood-label">RECENTLY READ · 최근 한 달</span>
          <span className="wood-label">TODAY'S PICKS · 오늘의 추천</span>
        </div>
        <div className="flex items-stretch gap-1.5">
          {/* 좌측 칸 */}
          <div className="wood-panel relative flex-1 rounded-sm px-2 pb-3 pt-1">
            <div className="flex min-h-[130px] items-end gap-[2px] overflow-x-auto pb-2">
              {recentBooks.length > 0 ? (
                recentBooks.map((b) => <BookSpine key={b.id} book={b} />)
              ) : (
                <p className="w-full pt-10 text-center text-[10px] italic text-stone-700/60">
                  아직 완독한 책이 없어요
                </p>
              )}
            </div>
            {/* 바닥 판재 */}
            <div className="wood-plank absolute inset-x-1 bottom-1 h-[6px]" />
          </div>

          {/* 세로 구분판 */}
          <div className="wood-divider w-[10px] rounded-sm" />

          {/* 우측 칸 */}
          <div className="wood-panel relative flex-1 rounded-sm px-2 pb-3 pt-1">
            <div className="flex min-h-[130px] items-end gap-[2px] pb-2">
              {recs.map((r, i) => (
                <RecommendedSpine key={`${r.title}-${i}`} rec={r} idx={i} />
              ))}
            </div>
            <div className="wood-plank absolute inset-x-1 bottom-1 h-[6px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
