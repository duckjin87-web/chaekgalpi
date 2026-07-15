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

function RecommendedSpine({ rec }: { rec: BookRec }) {
  const h = stableHash(rec.title);
  const width = 24 + (h % 6);
  const height = 108 - (h % 10);
  const rotate = ((h % 5) - 2) * 0.5;

  return (
    <div
      className="book-spine flex flex-shrink-0 flex-col items-center justify-center"
      style={{
        width,
        height,
        backgroundColor: rec.color,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "bottom center",
      }}
      title={`${rec.title} — ${rec.author} (${rec.genre})`}
    >
      <span className="book-spine-title">{rec.title}</span>
    </div>
  );
}

export default function TwoShelfCase({ recentBooks, allBooks }: TwoShelfCaseProps) {
  const recs = getDailyRecommendations(allBooks);

  return (
    <div className="wood-frame mb-4 rounded-md p-1.5">
      <div className="flex items-stretch gap-1">
        {/* 좌측: 최근 한 달 내 읽은 책 */}
        <div className="wood-panel relative flex-1 rounded-sm pb-3 pl-2 pr-2 pt-1.5">
          <p className="wood-label mb-1">RECENTLY READ · 최근 한 달</p>
          <div className="flex min-h-[110px] items-end gap-[3px] overflow-x-auto pb-1">
            {recentBooks.length > 0 ? (
              recentBooks.map((b) => <BookSpine key={b.id} book={b} />)
            ) : (
              <p className="w-full pt-6 text-center text-[10px] italic text-stone-500/70">
                아직 완독한 책이 없어요
              </p>
            )}
          </div>
          <div className="wood-plank absolute inset-x-1 bottom-1 h-2 rounded-sm" />
        </div>

        {/* 목재 구분판 */}
        <div className="wood-divider w-[3px] rounded-sm" />

        {/* 우측: 오늘의 추천 */}
        <div className="wood-panel relative flex-1 rounded-sm pb-3 pl-2 pr-2 pt-1.5">
          <p className="wood-label mb-1">TODAY'S PICKS · 오늘의 추천</p>
          <div className="flex min-h-[110px] items-end gap-[3px] pb-1">
            {recs.map((r, i) => (
              <RecommendedSpine key={`${r.title}-${i}`} rec={r} />
            ))}
          </div>
          <div className="wood-plank absolute inset-x-1 bottom-1 h-2 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
