import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLibraryStore } from "../store/useLibraryStore";
import MindMapEditor from "../components/mindmap/MindMapEditor";
import ReviewEditor from "../components/review/ReviewEditor";
import EditBookModal from "../components/library/EditBookModal";

type Tab = "mindmap" | "review";

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));
  const removeBook = useLibraryStore((s) => s.removeBook);
  const updateBook = useLibraryStore((s) => s.updateBook);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "review" ? "review" : "mindmap");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);

  if (!book || !bookId) {
    return (
      <div className="p-6">
        <p className="text-stone-500">책을 찾을 수 없어요.</p>
        <Link to="/" className="text-emerald-700 hover:underline">
          서재로 돌아가기
        </Link>
      </div>
    );
  }

  const currentBook = book;

  function handleDelete() {
    if (!confirm(`'${currentBook.title}'을 서재에서 삭제할까요?`)) return;
    removeBook(currentBook.id);
    navigate("/");
  }

  return (
    <div className="flex h-screen flex-col bg-stone-50 p-6">
      <Link to="/" className="text-sm text-stone-500 hover:underline">
        ← 서재로
      </Link>
      <div className="mt-2 mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-800">{book.title}</h1>
          <p className="text-sm text-stone-500">
            {book.author}
            {book.publisher ? ` · ${book.publisher}` : ""}
            {book.publishedDate ? ` · ${book.publishedDate}` : ""}
            {book.pageCount ? ` · ${book.pageCount}쪽` : ""}
          </p>
        </div>
        <div className="flex gap-3">
          {book.readingPrompts && (
            <button
              onClick={() => setShowPrompts((v) => !v)}
              className="text-sm text-emerald-700 hover:underline"
            >
              {showPrompts ? "생각거리 닫기" : "읽기 전 생각거리"}
            </button>
          )}
          <button onClick={() => setShowEditModal(true)} className="text-sm text-stone-600 hover:underline">
            정보 수정
          </button>
          <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
            책 삭제
          </button>
        </div>
      </div>

      {book.readingPrompts && showPrompts && (
        <div className="mb-4 space-y-1.5 rounded-md border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-stone-700">
          <p className="text-xs font-medium text-emerald-800">📖 읽으며 생각해볼 것</p>
          <p>
            <span className="mr-1 font-medium text-emerald-800">Q1.</span>
            {book.readingPrompts.questions[0]}
          </p>
          <p>
            <span className="mr-1 font-medium text-emerald-800">Q2.</span>
            {book.readingPrompts.questions[1]}
          </p>
          <p className="border-t border-emerald-100 pt-1.5">
            <span className="mr-1 font-medium text-amber-700">핵심 주제.</span>
            {book.readingPrompts.coreTheme}
          </p>
        </div>
      )}
      {showEditModal && (
        <EditBookModal
          book={currentBook}
          onClose={() => setShowEditModal(false)}
          onSave={(patch) => updateBook(currentBook.id, patch)}
        />
      )}

      <div className="mb-4 flex flex-shrink-0 gap-4 border-b border-stone-200">
        <button
          onClick={() => setTab("mindmap")}
          className={`pb-2 text-sm ${
            tab === "mindmap" ? "border-b-2 border-emerald-800 font-medium text-emerald-800" : "text-stone-500"
          }`}
        >
          마인드맵
        </button>
        <button
          onClick={() => setTab("review")}
          className={`pb-2 text-sm ${
            tab === "review" ? "border-b-2 border-emerald-800 font-medium text-emerald-800" : "text-stone-500"
          }`}
        >
          독후감
        </button>
      </div>

      <div className={`min-h-0 flex-1 ${tab === "mindmap" ? "overflow-hidden" : "overflow-auto"}`}>
        {tab === "mindmap" ? <MindMapEditor bookId={bookId} /> : <ReviewEditor bookId={bookId} />}
      </div>
    </div>
  );
}
