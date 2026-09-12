import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLibraryStore } from "../store/useLibraryStore";
import MindMapEditor from "../components/mindmap/MindMapEditor";
import ReviewEditor from "../components/review/ReviewEditor";
import EditBookModal from "../components/library/EditBookModal";
import CompletionCelebration from "../components/common/CompletionCelebration";
import type { BookStatus } from "../types";

type Tab = "mindmap" | "review";

const statusStyle: Record<BookStatus, string> = {
  읽고싶음: "bg-stone-100 text-stone-600",
  읽는중: "bg-[#e8f0fb] text-[#1a54a6]",
  완독: "bg-[#fdeaec] text-[#e8112d]",
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
  const [celebrating, setCelebrating] = useState(false);
  const celebrationFiredRef = useRef(false);

  // 100% 도달 시 자동으로 완독 처리 + 축하 (한 번만)
  useEffect(() => {
    if (!book) return;
    const totalNow = book.bookType === "전자책" ? 100 : book.pageCount ?? 0;
    const curNow = book.currentPage ?? 0;
    if (
      totalNow > 0 &&
      curNow >= totalNow &&
      book.status !== "완독" &&
      !celebrationFiredRef.current
    ) {
      celebrationFiredRef.current = true;
      updateBook(book.id, {
        status: "완독",
        finishDate: book.finishDate ?? new Date().toISOString(),
      });
      setCelebrating(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.currentPage, book?.pageCount, book?.bookType, book?.status]);

  function completeReading() {
    if (!book) return;
    updateBook(book.id, {
      status: "완독",
      finishDate: book.finishDate ?? new Date().toISOString(),
      currentPage:
        book.bookType === "전자책" ? 100 : book.pageCount ?? book.currentPage,
    });
    celebrationFiredRef.current = true;
    setCelebrating(true);
  }

  function handleStatusClick() {
    if (!book) return;
    if (book.status === "완독") {
      if (confirm("완독 상태를 '읽는 중'으로 되돌릴까요?")) {
        celebrationFiredRef.current = false;
        updateBook(book.id, { status: "읽는중" });
      }
      return;
    }
    // 읽고싶음/읽는중 클릭 → 완독으로 표시
    const label = book.status === "읽는중" ? "이 책을 완독으로 표시할까요?" : "이 책을 완독으로 바로 표시할까요?";
    if (confirm(label)) completeReading();
  }

  if (!book || !bookId) {
    return (
      <div className="p-6">
        <p className="text-stone-500">책을 찾을 수 없어요.</p>
        <Link to="/" className="text-ink hover:underline">
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
    <div className="paper-texture thick-scroll h-screen overflow-y-auto">
      <div className="paper-texture sticky top-0 z-30 flex items-center justify-between px-5 pb-1 pt-3">
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
        <div className="space-y-3 px-5 pt-1">
            {/* YES24 상품 상세형 헤더: 표지 좌측 + 정보 우측 */}
            <div className="y24-card mt-2 flex gap-4 p-4">
                <div className="w-[104px] flex-shrink-0">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="block w-full rounded-sm border border-stone-200 object-contain shadow-sm"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center rounded-sm border border-stone-200 bg-stone-100 text-2xl">
                      📖
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-[19px] font-bold leading-snug text-stone-800">
                    {book.title}
                  </h1>
                  <p className="y24-meta mt-1.5">
                    {book.author}
                    {book.publisher && (
                      <>
                        <span className="sep">|</span>
                        {book.publisher}
                      </>
                    )}
                    {book.publishedDate && (
                      <>
                        <span className="sep">|</span>
                        {book.publishedDate.slice(0, 10)}
                      </>
                    )}
                  </p>
                  <button
                    onClick={handleStatusClick}
                    className={`mt-2.5 inline-block rounded-sm px-2 py-0.5 text-[11px] font-medium ${statusStyle[book.status]}`}
                    title={book.status === "완독" ? "탭해서 되돌리기" : "탭해서 완독으로 표시"}
                  >
                    {book.status}
                  </button>
                  <div className="mt-3 flex gap-2 text-xs">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="rounded-sm border border-[#d9e2ef] bg-white px-2.5 py-1 text-stone-600"
                    >
                      정보 수정
                    </button>
                    <button
                      onClick={handleDelete}
                      className="rounded-sm border border-[#f3c6cc] bg-white px-2.5 py-1 text-y24red"
                    >
                      삭제
                    </button>
                  </div>
                </div>
            </div>

            {/* 정보 칩 */}
            <div className="y24-card grid grid-cols-3 divide-x divide-[#edf1f6]">
              <div className="px-2 py-2.5 text-center">
                <p className="text-[11px] text-stone-400">책 유형</p>
                <p className="mt-0.5 text-[13px] font-medium text-stone-700">
                  {book.bookType ?? "종이책"}
                </p>
              </div>
              <div className="px-2 py-2.5 text-center">
                <p className="text-[11px] text-stone-400">
                  {isEbook ? "진도 단위" : "전체 페이지"}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-stone-700">
                  {isEbook ? "0~100%" : book.pageCount ? `${book.pageCount}p` : "—"}
                </p>
              </div>
              <div className="px-2 py-2.5 text-center">
                <p className="text-[11px] text-stone-400">출판</p>
                <p className="mt-0.5 text-[13px] font-medium text-stone-700">
                  {book.publishedDate?.slice(0, 10) ?? "—"}
                </p>
              </div>
            </div>

            {/* 독서 진행률 */}
            {total > 0 && (
              <div className="y24-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-500">독서 진행률</span>
                  {days !== null && (
                    <span className="text-xs font-semibold text-y24red">{days}일째</span>
                  )}
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-[#1a54a6] transition-all"
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
                    className="w-16 rounded-sm border border-[#d9e2ef] px-1.5 py-0.5 text-center font-semibold text-stone-800"
                  />
                  <span className="text-stone-400">{isEbook ? "%" : `/ ${total}`}</span>
                  <span className="ml-auto font-semibold text-ink">{progress}%</span>
                </div>
              </div>
            )}

            {/* 책 소개 */}
            {book.description && (
              <div className="y24-card p-4">
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
              <details className="y24-card p-4">
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

      {showEditModal && (
        <EditBookModal
          book={currentBook}
          onClose={() => setShowEditModal(false)}
          onSave={(patch) => updateBook(currentBook.id, patch)}
        />
      )}

      {/* 탭 (스크롤 시 상단 고정) */}
      <div className="paper-texture sticky top-[38px] z-20 mt-3 flex gap-5 border-b border-[#d9e2ef] px-5">
        <button
          onClick={() => setTab("mindmap")}
          className={`-mb-px border-b-[3px] px-1 pb-2 text-[15px] ${
            tab === "mindmap"
              ? "border-[#1a54a6] font-bold text-ink"
              : "border-transparent text-stone-500"
          }`}
        >
          마인드맵
        </button>
        <button
          onClick={() => setTab("review")}
          className={`-mb-px border-b-[3px] px-1 pb-2 text-[15px] ${
            tab === "review"
              ? "border-[#1a54a6] font-bold text-ink"
              : "border-transparent text-stone-500"
          }`}
        >
          독후감
        </button>
      </div>

      {/* 콘텐츠: 마인드맵은 화면을 꽉 채우고, 위쪽 sticky 헤더/탭으로 정보로 복귀 가능 */}
      <div className="px-5 pb-6 pt-3">
        {tab === "mindmap" ? (
          <div className="h-[calc(100vh-90px)] w-full">
            <MindMapEditor bookId={bookId} />
          </div>
        ) : (
          <ReviewEditor bookId={bookId} />
        )}
      </div>

      {celebrating && (
        <CompletionCelebration
          title={currentBook.title}
          onDone={() => {
            setCelebrating(false);
            setTab("review");
            // 정보 카드를 접어 독후감이 바로 보이도록
            setShowInfo(false);
          }}
        />
      )}
    </div>
  );
}
