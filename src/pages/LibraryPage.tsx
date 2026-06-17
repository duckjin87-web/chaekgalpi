import { useMemo, useState } from "react";
import { useLibraryStore } from "../store/useLibraryStore";
import type { BookStatus } from "../types";
import BookCard from "../components/library/BookCard";
import AddBookModal from "../components/library/AddBookModal";
import LibraryToolbar from "../components/library/LibraryToolbar";

export default function LibraryPage() {
  const books = useLibraryStore((s) => s.books);
  const addBook = useLibraryStore((s) => s.addBook);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookStatus | "전체">("전체");
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

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <h1 className="mb-6 font-serif text-2xl font-bold text-stone-800">나의 서재</h1>
      <LibraryToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAddClick={() => setShowAddModal(true)}
      />
      <div className="flex flex-wrap gap-4">
        {filteredBooks.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
        {filteredBooks.length === 0 && (
          <p className="text-sm text-stone-400">조건에 맞는 책이 없어요.</p>
        )}
      </div>
      {showAddModal && (
        <AddBookModal onClose={() => setShowAddModal(false)} onAdd={addBook} />
      )}
    </div>
  );
}
