import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLibraryStore } from "../store/useLibraryStore";
import MindMapEditor from "../components/mindmap/MindMapEditor";
import ReviewEditor from "../components/review/ReviewEditor";
import EditBookModal from "../components/library/EditBookModal";
import type { BookStatus } from "../types";

type Tab = "mindmap" | "review";

const statusStyle: Record<BookStatus, string> = {
  읽고싶음: "bg-stone-100 text-stone-600",
  읽는중: "bg-emerald-100 text-emerald-700",
  완독: "bg-amber-100 text-amber-700",
};

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return null;
  const diff = Date.now() - start;
  return Math.max(1, Math.floor(diff / 86400000) + 1);
}

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));
  const removeBook = useLibraryStore((s) => s.removeBook);
  const updateBook = useLibraryStore((s) => s.updateBook);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "review" ? "review" : "mindmap");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [pageDraft, setPageDraft] = useState<string | null>(null);

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

  function commitCurrentPage() {
    if (pageDraft === null) return;
    const n = Number(pageDraft);
    updateBook(currentBook.id, {
      currentPage: pageDraft.trim() === "" || Number.isNaN(n) ? undefined : Math.max(0, n),
    });
    setPageDraft(null);
  }

  const days = daysSince(book.startDate ?? book.createdAt);
  const isEbook = book.bookType === "전자책";
  const total = isEbook ? 100 : book.pageCount ?? 0;
  const current = book.currentPage ?? 0;
  const progress = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="paper-texture h-screen overflow-y-auto">
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-stone-500 hover:underline">
            ← 서재로
          </Link>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            {showInfo ? "정보 접기 ▲" : "정보 펼치기 ▼"}
          </button>
        </div>

        {showInfo && (
          <div className="mt-3 space-y-3">
            {/* 헤더 카드 */}
            <div className="flex gap-4 rounded-xl paper-card border border-stone-200/60 p-4">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="h-32 w-24 flex-shrink-0 rounded-md object-cover shadow"
                />
              ) : (
                <div className="flex h-32 w-24 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-stone-300 to-stone-400 text-3xl">
                  📖
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-xl font-bold leading-tight text-stone-800">
                  {book.title}
                </h1>
                <p className="mt-1 text-sm text-stone-600">{book.author}</p>
                {book.publisher && <p className="text-sm text-stone-400">{book.publisher}</p>}
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[book.status]}`}
                >
                  {book.status}
                </span>
                <div className="mt-2 flex gap-3 text-xs">
                  <button onClick={() => setShowEditModal(true)} className="text-stone-500 hover:underline">
                    정보 수정
                  </button>
                  <button onClick={handleDelete} className="text-red-500 hover:underline">
                    삭제
                  </button>
                </div>
              </div>
            </div>

            {/* 정보 칩 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="paper-card rounded-lg border border-stone-200/60 p-2.5 text-center">
                <p className="text-[11px] text-stone-400">📚 책 유형</p>
                <p className="mt-0.5 text-sm font-medium text-stone-700">{book.bookType ?? "종이책"}</p>
              </div>
              <div className="paper-card rounded-lg border border-stone-200/60 p-2.5 text-center">
                <p className="text-[11px] text-stone-400">{isEbook ? "📖 진도 단위" : "📖 전체 페이지"}</p>
                <p className="mt-0.5 text-sm font-medium text-stone-700">
                  {isEbook ? "% (0~100)" : book.pageCount ? `p. ${book.pageCount}` : "—"}
                </p>
              </div>
              <div className="paper-card rounded-lg border border-stone-200/60 p-2.5 text-center">
                <p className="text-[11px] text-stone-400">🗓 출판</p>
                <p className="mt-0.5 text-sm font-medium text-stone-700">
                  {book.publishedDate ?? "—"}
                </p>
              </div>
            </div>

            {/* 독서 진행률 */}
            {total > 0 && (
              <div className="rounded-xl paper-card border border-stone-200/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-500">독서 진행률</span>
                  {days !== null && (
                    <span className="text-xs font-semibold text-amber-600">{days}일째</span>
                  )}
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  {!isEbook && <span className="text-stone-400">p.</span>}
                  <input
                    type="number"
                    min={0}
                    max={total}
                    value={pageDraft ?? current}
                    onChange={(e) => setPageDraft(e.target.value)}
                    onBlur={commitCurrentPage}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="w-16 rounded border border-stone-300 px-1.5 py-0.5 text-center font-semibold text-stone-800"
                  />
                  <span className="text-stone-400">{isEbook ? "%" : `/ ${total}`}</span>
                  <span className="ml-auto font-semibold text-emerald-700">{progress}%</span>
                </div>
              </div>
            )}

            {/* 책 소개 */}
            {book.description && (
              <div className="rounded-xl paper-card border border-stone-200/60 p-4">
                <p className="mb-1.5 text-xs font-medium text-stone-500">책 소개</p>
                <p
                  className={`whitespace-pre-line text-sm leading-relaxed text-stone-700 ${
                    descExpanded ? "" : "line-clamp-3"
                  }`}
                >
                  {book.description}
                </p>
                {book.description.length > 80 && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-1 text-xs text-emerald-700 hover:underline"
                  >
                    {descExpanded ? "접기" : "더보기"}
                  </button>
                )}
              </div>
            )}

            {/* 목차 */}
            {book.toc && book.toc.length > 0 && (
              <details className="rounded-xl paper-card border border-stone-200/60 p-4">
                <summary className="cursor-pointer text-xs font-medium text-stone-500">
                  목차 ({book.toc.length})
                </summary>
                <ul className="mt-2 space-y-1 text-sm leading-relaxed text-stone-700">
                  {book.toc.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </details>
            )}

            {/* 태그 */}
            {book.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {book.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {book.readingPrompts && (
              <p className="text-center text-[11px] text-stone-400">
                📖 서평 기반 생각거리는 '독후감' 탭에서 답을 적으며 볼 수 있어요
              </p>
            )}
          </div>
        )}
      </div>

      {showEditModal && (
        <EditBookModal
          book={currentBook}
          onClose={() => setShowEditModal(false)}
          onSave={(patch) => updateBook(currentBook.id, patch)}
        />
      )}

      {/* 탭 (스크롤 시 상단 고정) */}
      <div className="paper-texture sticky top-0 z-10 mb-3 mt-4 flex gap-4 border-b border-stone-200 px-5 pt-2">
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

      <div className="px-5 pb-6">
        {tab === "mindmap" ? (
          <div className="h-[80vh] w-full">
            <MindMapEditor bookId={bookId} />
          </div>
        ) : (
          <ReviewEditor bookId={bookId} />
        )}
      </div>
    </div>
  );
}
