import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLibraryStore } from "../store/useLibraryStore";
import MindMapEditor from "../components/mindmap/MindMapEditor";
import ReviewEditor from "../components/review/ReviewEditor";

type Tab = "mindmap" | "review";

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));
  const removeBook = useLibraryStore((s) => s.removeBook);
  const [tab, setTab] = useState<Tab>("mindmap");

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
    <div className="min-h-screen bg-stone-50 p-6">
      <Link to="/" className="text-sm text-stone-500 hover:underline">
        ← 서재로
      </Link>
      <div className="mt-2 mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-800">{book.title}</h1>
          <p className="text-sm text-stone-500">{book.author}</p>
        </div>
        <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
          책 삭제
        </button>
      </div>

      <div className="mb-4 flex gap-4 border-b border-stone-200">
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

      {tab === "mindmap" ? <MindMapEditor bookId={bookId} /> : <ReviewEditor bookId={bookId} />}
    </div>
  );
}
