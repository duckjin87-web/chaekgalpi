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

const statusStyle: Record<Book["status"], string> = {
  읽고싶음: "bg-amber-100 text-amber-900",
  읽는중: "bg-emerald-100 text-emerald-900",
  완독: "bg-stone-200 text-stone-700",
};

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
      <Link
        to={`/book/${book.id}`}
        className="paper-card group relative flex w-32 shrink-0 flex-col gap-1.5 rounded-sm p-2 pb-2 transition-transform hover:-translate-y-1"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <span className="tape tape-tc" />
        <div
          className="flex h-44 w-full items-center justify-center overflow-hidden text-center text-sm text-white shadow-inner"
          style={{ backgroundColor: book.coverUrl ? undefined : accent }}
        >
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 font-serif">{book.title}</span>
          )}
        </div>
        <span
          className={`self-center rounded-sm px-2 py-0.5 text-[10px] font-medium tracking-[0.15em] ${statusStyle[book.status]}`}
        >
          {statusLabel[book.status]}
        </span>
      </Link>
    </div>
  );
}
