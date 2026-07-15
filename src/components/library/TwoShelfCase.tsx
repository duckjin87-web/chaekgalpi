import { Link } from "react-router-dom";
import type { Book } from "../../types";
import { getDailyRecommendations } from "../../lib/recommendations";

interface TwoShelfCaseProps {
  recentBooks: Book[];
  allBooks: Book[];
}

export default function TwoShelfCase({ recentBooks, allBooks }: TwoShelfCaseProps) {
  const recs = getDailyRecommendations(allBooks);

  return (
    <div className="mb-4">
      {/* 실사 원목 책장 사진 */}
      <div className="relative overflow-hidden rounded-md shadow-md">
        <img src="/bookshelf.jpg" alt="원목 책장" className="block w-full" />
        {/* 좌·우 라벨 오버레이 */}
        <div className="absolute inset-x-0 top-1 flex justify-between px-3 text-[9px] font-semibold tracking-[0.28em] text-stone-700/70">
          <span>RECENTLY READ</span>
          <span>TODAY'S PICKS</span>
        </div>
      </div>

      {/* 이미지 아래: 실제 데이터를 두 칸으로 나눠 표시 */}
      <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-stone-200/60 bg-white/60 p-3 text-xs backdrop-blur-sm">
        <div className="min-w-0">
          <p className="mb-1 font-serif text-[13px] font-bold text-ink">최근 한 달 완독</p>
          {recentBooks.length > 0 ? (
            <ul className="space-y-1">
              {recentBooks.slice(0, 6).map((b) => (
                <li key={b.id} className="truncate">
                  <Link
                    to={`/book/${b.id}`}
                    className="text-stone-700 hover:text-ink hover:underline"
                  >
                    · {b.title}
                    {b.author && <span className="text-stone-400"> {b.author}</span>}
                  </Link>
                </li>
              ))}
              {recentBooks.length > 6 && (
                <li className="text-[10px] italic text-stone-400">
                  외 {recentBooks.length - 6}권 더
                </li>
              )}
            </ul>
          ) : (
            <p className="italic text-stone-400">완독한 책이 없어요</p>
          )}
        </div>
        <div className="min-w-0 border-l border-stone-200 pl-2">
          <p className="mb-1 font-serif text-[13px] font-bold text-ink">오늘의 추천</p>
          <ul className="space-y-1">
            {recs.map((r, i) => (
              <li key={`${r.title}-${i}`} className="truncate">
                <span className="mr-1 rounded-sm bg-stone-100 px-1 py-0.5 text-[9px] tracking-wide text-stone-500">
                  {r.genre}
                </span>
                <span className="text-stone-700">{r.title}</span>
                <span className="ml-1 text-[10px] text-stone-400">{r.author}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
