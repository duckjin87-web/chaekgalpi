import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLibraryStore } from "../store/useLibraryStore";
import type { Book, BookStatus } from "../types";
import BookCard from "../components/library/BookCard";
import AddBookModal from "../components/library/AddBookModal";
import LibraryToolbar from "../components/library/LibraryToolbar";
import ThreeTierShelf from "../components/library/ThreeTierShelf";
import JournalSummary from "../components/library/JournalSummary";

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

  // 하단 탭 바의 '책 추가'로 들어오면 추가 창을 연다
  const location = useLocation();
  const addRequest = (location.state as { add?: number } | null)?.add;
  const navigate = useNavigate();
  useEffect(() => {
    if (!addRequest) return;
    setShowAddModal(true);
    // 요청은 한 번만 쓴다 — 남겨두면 새로고침·뒤로가기 때 추가 창이 다시 열린다
    navigate("/", { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addRequest]);

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

  const lastTouched = (b: Book): number => {
    const mm = mindMaps.find((m) => m.bookId === b.id)?.updatedAt;
    const rv = reviews.find((r) => r.bookId === b.id)?.updatedAt;
    return Math.max(
      new Date(mm ?? 0).getTime() || 0,
      new Date(rv ?? 0).getTime() || 0,
      new Date(b.createdAt).getTime() || 0
    );
  };

  const inProgressBooks = useMemo(() => {
    return filteredBooks
      .filter((b) => b.status !== "완독")
      .sort((a, b) => lastTouched(b) - lastTouched(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="paper-texture min-h-screen px-5 pb-24 pt-4">
      <header className="journal-header mb-4 flex flex-col gap-0.5 px-1">
        <span className="text-[13px] font-semibold text-stone-500">
          {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
        </span>
        <h1 className="font-serif text-[34px] font-extrabold leading-tight tracking-tight text-ink">책갈피</h1>
      </header>

      {/* 저널형 요약 — 지금 읽는 책 · 이번 달 완독 · 마인드맵 기록 · 월별 완독 */}
      <div className="mb-5">
        <JournalSummary
          books={books}
          mindMaps={mindMaps}
          current={books
            .filter((b) => b.status === "읽는중")
            .sort((a, b) => lastTouched(b) - lastTouched(a))[0]}
        />
      </div>

      <LibraryToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        years={showDateFilters ? years : undefined}
        yearFilter={yearFilter}
        onYearFilterChange={setYearFilter}
        monthFilter={monthFilter}
        onMonthFilterChange={setMonthFilter}
      />

      {/* 상단: 읽는 중 · 읽고 싶은 책 (카드 = 표지 + 상태만) */}
      {inProgressBooks.length > 0 && (
        <div className="mb-6">
          <div className="mb-1 flex items-baseline gap-2">
            <p className="font-serif text-[22px] font-bold tracking-tight text-ink">읽는 중 · 읽고 싶은 책</p>
          </div>
          <div className="stagger flex gap-2 overflow-x-auto pb-3">
            {inProgressBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}

      {filteredBooks.length === 0 && (
        <p className="mb-4 text-sm text-stone-400">조건에 맞는 책이 없어요.</p>
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
