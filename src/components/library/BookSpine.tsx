import { Link } from "react-router-dom";
import type { Book } from "../../types";
import { randomBookmarkColor } from "../../theme";

interface BookSpineProps {
  book: Book;
  compact?: boolean;
}

export default function BookSpine({ book, compact }: BookSpineProps) {
  const accent = randomBookmarkColor();
  return (
    <Link
      to={`/book/${book.id}`}
      className="group relative flex flex-shrink-0 flex-col items-center justify-end overflow-hidden rounded-t-sm border border-stone-400/60 shadow-md transition-transform hover:-translate-y-1"
      style={{
        width: compact ? 30 : 40,
        height: compact ? 110 : 150,
        backgroundColor: book.coverUrl ? undefined : accent,
      }}
      title={book.title}
    >
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] font-medium leading-tight text-white"
          style={{ writingMode: "vertical-rl" }}
        >
          {book.title}
        </span>
      )}
    </Link>
  );
}
