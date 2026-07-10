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

export default function BookCard({ book }: BookCardProps) {
  const accent = book.coverUrl ? undefined : randomBookmarkColor();

  return (
    <div className="paper-card group relative flex w-40 shrink-0 flex-col gap-2 rounded-md border border-stone-200/60 p-3 transition-transform hover:-translate-y-1">
      <Link to={`/book/${book.id}`} className="flex flex-col gap-2">
        <div
          className="flex h-52 w-full items-center justify-center overflow-hidden rounded-sm bg-stone-100 text-center text-sm text-white"
          style={{ backgroundColor: book.coverUrl ? undefined : accent }}
        >
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 font-serif">{book.title}</span>
          )}
        </div>
        <div>
          <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
            {statusLabel[book.status]}
          </span>
        </div>
      </Link>
      <Link
        to={`/book/${book.id}?tab=review`}
        className="rounded bg-emerald-800 px-2 py-1 text-center text-xs text-white hover:bg-emerald-900"
      >
        독후감 보기
      </Link>
    </div>
  );
}
