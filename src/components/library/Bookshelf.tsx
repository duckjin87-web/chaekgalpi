import type { Book } from "../../types";
import BookSpine from "./BookSpine";

interface BookshelfProps {
  title: string;
  books: Book[];
  compact?: boolean;
}

export default function Bookshelf({ title, books, compact }: BookshelfProps) {
  if (books.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-medium text-stone-600">{title}</p>
      <div className="rounded-md bg-gradient-to-b from-[#ecdfc5] to-[#d6c198] p-3 pt-4">
        <div className="flex items-end gap-1.5 overflow-x-auto pb-3">
          {books.map((book) => (
            <BookSpine key={book.id} book={book} compact={compact} />
          ))}
        </div>
        <div className="h-2.5 rounded-b-sm bg-[#a9824f] shadow" />
      </div>
    </div>
  );
}
