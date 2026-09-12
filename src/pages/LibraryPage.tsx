import { useMemo, useState } from "react";
import { useLibraryStore } from "../store/useLibraryStore";
import type { Book, BookStatus } from "../types";
import BookCard from "../components/library/BookCard";
import AddBookModal from "../components/library/AddBookModal";
import LibraryToolbar from "../components/library/LibraryToolbar";
import ThreeTierShelf from "../components/library/ThreeTierShelf";

const DATE_FILTER_THRESHOLD = 8;
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

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
    (b) => now - readDate(b).getTime() <= SIX_MONTHS_MS
  );
  const olderFinished = dateFilteredFinishedBooks.filter(
    (b) => now - readDate(b).getTime() > SIX_MONTHS_MS
  );

  const showDateFilters = finishedBooks.length > DATE_FILTER_THRESHOLD;

  return (
    <div className="paper-texture min-h-screen px-5 pb-6 pt-4">
      {/* YES24식 헤더: 블루 로고타입 + 하단 굵은 블루 라인 */}
      <header className="mb-3">
        <div className="flex items-end justify-between">
          <h1 className="font-serif text-[30px] font-black leading-none tracking-tight text-ink">
            책갈피
          </h1>
          <span className="y24-badge-solid mb-1">내 서재 {books.length}권</span>
        </div>
        <div className="mt-2 border-b-2 border-[#1a54a6]" />
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

      {/* 읽는 중 · 읽고 싶은 책 — YES24 상품 리스트 레이아웃 */}
      {inProgressBooks.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="y24-section-title text-[15px]">읽는 중 · 읽고 싶은 책</p>
            <span className="text-[12px] text-stone-400">{inProgressBooks.length}건</span>
          </div>
          <div className="y24-card y24-divide overflow-hidden">
            {inProgressBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}

      {filteredBooks.length === 0 && (
        <div className="y24-card mb-4 px-4 py-8 text-center text-sm text-stone-400">
          조건에 맞는 책이 없어요.
        </div>
      )}

      {/* 하단: 3단 목재 책장 */}
      <ThreeTierShelf
        recentBooks={recentFinished}
        oldBooks={olderFinished}
        allBooks={books}
      />

      {showAddModal && (
        <AddBookModal onClose={() => setShowAddModal(false)} onAdd={addBook} />
      )}
    </div>
  );
}
