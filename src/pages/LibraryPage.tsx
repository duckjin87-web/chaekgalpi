import { useMemo, useState } from "react";
import { useLibraryStore } from "../store/useLibraryStore";
import type { Book, BookStatus } from "../types";
import BookCard from "../components/library/BookCard";
import AddBookModal from "../components/library/AddBookModal";
import LibraryToolbar from "../components/library/LibraryToolbar";
import Bookshelf from "../components/library/Bookshelf";

const DATE_FILTER_THRESHOLD = 8;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function readDate(book: Book): Date {
  return new Date(book.finishDate ?? book.createdAt);
}

export default function LibraryPage() {
  const books = useLibraryStore((s) => s.books);
  const addBook = useLibraryStore((s) => s.addBook);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookStatus | "전체">("전체");
  const [yearFilter, setYearFilter] = useState<number | "전체">("전체");
  const [monthFilter, setMonthFilter] = useState<number | "전체">("전체");
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesStatus = statusFilter === "전체" || book.status === statusFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [books, search, statusFilter]);

  const finishedBooks = useMemo(
    () => filteredBooks.filter((b) => b.status === "완독"),
    [filteredBooks]
  );
  const mindMaps = useLibraryStore((s) => s.mindMaps);
  const reviews = useLibraryStore((s) => s.reviews);

  // 마인드맵/독후감을 최근에 수정한 책이 맨 앞(좌측)에 오도록 정렬
  const inProgressBooks = useMemo(() => {
    const lastTouched = (b: Book): number => {
      const mm = mindMaps.find((m) => m.bookId === b.id)?.updatedAt;
      const rv = reviews.find((r) => r.bookId === b.id)?.updatedAt;
      return Math.max(
        new Date(mm ?? 0).getTime() || 0,
        new Date(rv ?? 0).getTime() || 0,
        new Date(b.createdAt).getTime() || 0
      );
    };
    return filteredBooks
      .filter((b) => b.status !== "완독")
      .sort((a, b) => lastTouched(b) - lastTouched(a));
  }, [filteredBooks, mindMaps, reviews]);

  const years = useMemo(() => {
    const set = new Set(finishedBooks.map((b) => readDate(b).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [finishedBooks]);

  const dateFilteredFinishedBooks = useMemo(() => {
    return finishedBooks.filter((b) => {
      const d = readDate(b);
      const matchesYear = yearFilter === "전체" || d.getFullYear() === yearFilter;
      const matchesMonth = monthFilter === "전체" || d.getMonth() + 1 === monthFilter;
      return matchesYear && matchesMonth;
    });
  }, [finishedBooks, yearFilter, monthFilter]);

  const now = Date.now();
  const recentFinished = dateFilteredFinishedBooks.filter(
    (b) => now - readDate(b).getTime() <= ONE_MONTH_MS
  );
  const olderFinished = dateFilteredFinishedBooks.filter(
    (b) => now - readDate(b).getTime() > ONE_MONTH_MS
  );

  const showDateFilters = finishedBooks.length > DATE_FILTER_THRESHOLD;

  return (
    <div className="paper-texture min-h-screen p-6">
      {/* 매거진 마스트헤드 */}
      <header className="mb-6">
        <p className="text-[10px] font-medium tracking-[0.45em] text-ink">READING JOURNAL</p>
        <div className="flex items-end justify-between">
          <h1 className="font-serif text-5xl font-black leading-none tracking-tight text-ink">
            책갈피
          </h1>
          <div className="pb-1 text-right text-[10px] leading-relaxed tracking-[0.25em] text-stone-500">
            <p>ONE PAGE,</p>
            <p>MY STORY.</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between border-t-2 border-ink pt-1.5 text-[10px] tracking-[0.2em] text-stone-500">
          <span>나의 서재 · ARCHIVE</span>
          <span>
            ISSUE NO. {books.length} · {new Date().getFullYear()}
          </span>
        </div>
      </header>
      <LibraryToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAddClick={() => setShowAddModal(true)}
        years={showDateFilters ? years : undefined}
        yearFilter={yearFilter}
        onYearFilterChange={setYearFilter}
        monthFilter={monthFilter}
        onMonthFilterChange={setMonthFilter}
      />

      {/* 한 달 내에 읽은 책장은 상단에 고정 */}
      <Bookshelf title="최근 한 달 내에 읽은 책" books={recentFinished} />

      {inProgressBooks.length > 0 && (
        <div className="mb-8">
          <div className="mb-1 flex items-baseline gap-2">
            <p className="font-serif text-base font-bold text-ink">읽는 중 · 읽고 싶은 책</p>
            <span className="text-[9px] tracking-[0.3em] text-stone-400">ON MY DESK</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3">
            {inProgressBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}

      <Bookshelf title="그 이전에 읽은 책" books={olderFinished} compact />

      {filteredBooks.length === 0 && (
        <p className="text-sm text-stone-400">조건에 맞는 책이 없어요.</p>
      )}

      {showAddModal && (
        <AddBookModal onClose={() => setShowAddModal(false)} onAdd={addBook} />
      )}
    </div>
  );
}
