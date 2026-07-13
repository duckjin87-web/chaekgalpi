import { Link } from "react-router-dom";
import type { Book } from "../../types";
import { randomBookmarkColor } from "../../theme";

interface BookCardProps {
  book: Book;
}

const statusLabel: Record<Book["status"], string> = {
  읽고싶음: "읽고 싶음",
  읽는중: "읽는 중",
  완독: "완독",
};

// 책 id 기반 고정 기울기(-2.2° ~ 2.2°): 종이에 붙인 스크랩 느낌
function scrapRotation(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 45) / 10) * (h % 2 === 0 ? 1 : -1);
}

export default function BookCard({ book }: BookCardProps) {
  const accent = book.coverUrl ? undefined : randomBookmarkColor();
  const rotation = scrapRotation(book.id);

  return (
    <div className="px-2 pt-4">
      <div
        className="paper-card group relative flex w-40 shrink-0 flex-col gap-2 rounded-sm p-3 pb-2 transition-transform hover:-translate-y-1"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <span className="tape tape-tc" />
        <Link to={`/book/${book.id}`} className="flex flex-col gap-2">
          <div
            className="flex h-52 w-full items-center justify-center overflow-hidden text-center text-sm text-white shadow-inner"
            style={{ backgroundColor: book.coverUrl ? undefined : accent }}
          >
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 font-serif">{book.title}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-[0.18em] text-ink">
              {statusLabel[book.status]}
            </span>
            <span className="text-[9px] tracking-[0.15em] text-stone-400">READ →</span>
          </div>
        </Link>
        <Link
          to={`/book/${book.id}?tab=review`}
          className="bg-ink rounded-sm px-2 py-1 text-center text-xs text-white"
        >
          독후감 보기
        </Link>
      </div>
    </div>
  );
}
