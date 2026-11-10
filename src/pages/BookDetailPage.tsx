import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLibraryStore } from "../store/useLibraryStore";
import MindMapEditor from "../components/mindmap/MindMapEditor";
import ReviewEditor from "../components/review/ReviewEditor";
import EditBookModal from "../components/library/EditBookModal";
import CompletionCelebration from "../components/common/CompletionCelebration";
import TouchScrollbar from "../components/common/TouchScrollbar";
import { useViewport } from "../lib/useViewport";
import { percentToPage } from "../lib/progress";
import { useThemeSettings } from "../lib/appTheme";
import TLink from "../components/common/TLink";
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
  const [celebrating, setCelebrating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const celebrationFiredRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { shortLandscape } = useViewport();
  const review = useLibraryStore((s) => s.getReview(bookId ?? ""));

  // 가로모드로 바뀌면 정보 카드를 접어 마인드맵/독후감 공간을 확보한다
  const prevLandscape = useRef(shortLandscape);
  useEffect(() => {
    if (shortLandscape !== prevLandscape.current) {
      prevLandscape.current = shortLandscape;
      if (shortLandscape) setShowInfo(false);
    }
  }, [shortLandscape]);

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

  /** 마인드맵·독후감·생각거리·구절을 한 PDF 로 묶어 저장/공유 */
  async function handleExport(mode: "download" | "share") {
    if (!book) return;
    setExporting(mode === "share" ? "공유 준비 중…" : "PDF 만드는 중…");
    const originalTab = tab;
    try {
      const { buildBookPdf, captureMindMap, downloadBlob, sharePdf } = await import(
        "../lib/exportPdf"
      );

      // 마인드맵은 화면에 떠 있어야 캡처되므로 잠시 마인드맵 탭으로 전환
      let mindMapDataUrl: string | undefined;
      if (originalTab !== "mindmap") {
        setTab("mindmap");
        await new Promise((r) => setTimeout(r, 450));
      }
      mindMapDataUrl = await captureMindMap();
      if (originalTab !== "mindmap") setTab(originalTab);

      const blob = await buildBookPdf({
        book,
        review,
        prompts: book.readingPrompts?.questions ?? [],
        answers: book.promptAnswers ?? [],
        mindMapDataUrl,
      });

      const safe = book.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
      const filename = `책갈피_${safe}.pdf`;

      if (mode === "share") {
        const shared = await sharePdf(blob, filename, book.title);
        if (!shared) {
          alert("이 브라우저는 파일 공유를 지원하지 않아 PDF를 저장했어요.\n저장된 파일을 메일·드라이브에 첨부해 주세요.");
        }
      } else {
        downloadBlob(blob, filename);
      }
    } catch (err: any) {
      alert(`내보내기에 실패했어요.\n${String(err?.message ?? err)}`);
      setTab(originalTab);
    } finally {
      setExporting(null);
    }
  }

  function commitCurrentPage() {
    if (pageDraft === null) return;
    const n = Number(pageDraft);
    updateBook(currentBook.id, {
      currentPage: pageDraft.trim() === "" || Number.isNaN(n) ? undefined : Math.max(0, n),
    });
    setPageDraft(null);
  }

  const { theme } = useThemeSettings();
  const days = daysSince(book.startDate ?? book.createdAt);
  const isEbook = book.bookType === "전자책";
  const total = isEbook ? 100 : book.pageCount ?? 0;
  const current = book.currentPage ?? 0;
  const progress = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const remainingLabel =
    progress >= 100 || total <= 0
      ? null
      : isEbook
        ? book.pageCount
          ? `약 ${book.pageCount - percentToPage(current, book.pageCount)}쪽 남았어요`
          : `${100 - progress}% 남았어요`
        : `${Math.max(0, total - current)}쪽 남았어요`;
  // 읽기 → 생각거리 → 독후감 진행 단계
  const steps = [
    { label: "읽기", done: progress >= 100 || book.status === "완독" },
    { label: "생각", done: (book.promptAnswers ?? []).some((a) => a?.trim()) },
    { label: "독후감", done: Boolean(review?.content?.trim()) },
  ];
  const currentStep = steps.findIndex((s) => !s.done);
  // 전자책: 입력 중인 % 값도 바로 페이지로 환산해 보여준다
  const draftNum = pageDraft !== null && pageDraft.trim() !== "" ? Number(pageDraft) : current;
  const ebookPage =
    isEbook && book.pageCount && !Number.isNaN(draftNum)
      ? percentToPage(draftNum, book.pageCount)
      : null;

  return (
    <div ref={scrollRef} className="paper-texture h-screen overflow-y-auto">
      <div className="paper-texture sticky top-0 z-30 flex items-center justify-between px-5 pb-1 pt-3">
        <TLink to="/" back className="text-sm text-stone-500 hover:underline">
          ← 서재로
        </TLink>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            {showInfo ? "정보 접기 ▲" : "정보 펼치기 ▼"}
          </button>
          {/* 항상 접근 가능한 메뉴 */}
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="rounded px-1.5 py-0.5 text-lg leading-none text-stone-500 hover:bg-stone-100"
              aria-label="메뉴"
            >
              ⋮
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="paper-card absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-md py-1 text-sm">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowEditModal(true);
                    }}
                    className="block w-full px-3 py-2 text-left text-stone-700 hover:bg-stone-100"
                  >
                    ✏️ 정보 수정
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      void handleExport("download");
                    }}
                    className="block w-full px-3 py-2 text-left text-stone-700 hover:bg-stone-100"
                  >
                    📄 PDF 저장
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      void handleExport("share");
                    }}
                    className="block w-full px-3 py-2 text-left text-stone-700 hover:bg-stone-100"
                  >
                    📤 공유하기
                  </button>
                  <div className="my-1 border-t border-stone-200" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleDelete();
                    }}
                    className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                  >
                    🗑 책 삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showInfo && (
        <div className="space-y-3 px-5 pt-1">
            {/* 매거진 화보형 헤더 */}
            <div className="relative mt-2">
              {/* 뒤에 깔린 잉크색 종이 레이어 */}
              <div className="absolute inset-0 translate-x-1 translate-y-1.5 rotate-[1.2deg] rounded-sm bg-ink opacity-85" />
              <div className="paper-card relative flex gap-4 rounded-sm p-4">
                <div className="vt-cover-detail relative w-[110px] flex-shrink-0">
                  <span className="tape tape-tl" />
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="block w-full rounded-sm object-contain shadow-md"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center rounded-sm bg-gradient-to-br from-stone-300 to-stone-400 text-3xl shadow-md">
                      📖
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] tracking-[0.35em] text-stone-400">NOW READING</p>
                  <h1 className="mt-0.5 font-serif text-2xl font-black leading-tight tracking-tight text-ink">
                    {book.title}
                  </h1>
                  <p className="mt-1 text-sm text-stone-600">{book.author}</p>
                  {book.publisher && (
                    <p className="text-xs tracking-wide text-stone-400">{book.publisher}</p>
                  )}
                  <button
                    onClick={handleStatusClick}
                    className={`mt-2 inline-block rounded-sm px-2 py-0.5 text-[11px] font-medium tracking-[0.15em] transition-transform hover:scale-105 ${statusStyle[book.status]}`}
                    title={book.status === "완독" ? "탭해서 되돌리기" : "탭해서 완독으로 표시"}
                  >
                    {book.status}
                  </button>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="text-stone-500 hover:underline"
                    >
                      정보 수정
                    </button>
                    <button onClick={handleDelete} className="text-red-500 hover:underline">
                      삭제
                    </button>
                    <span className="h-3 w-px bg-stone-300" />
                    <button
                      onClick={() => void handleExport("download")}
                      disabled={!!exporting}
                      className="text-ink hover:underline disabled:opacity-40"
                    >
                      PDF 저장
                    </button>
                    <button
                      onClick={() => void handleExport("share")}
                      disabled={!!exporting}
                      className="text-ink hover:underline disabled:opacity-40"
                    >
                      공유하기
                    </button>
                  </div>
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
                <p className="text-[11px] text-stone-400">📖 전체 페이지</p>
                <p className="mt-0.5 text-sm font-medium text-stone-700">
                  {book.pageCount ? `p. ${book.pageCount}` : isEbook ? "% 진도" : "—"}
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
                <div className="mt-2 flex items-center gap-3">
                  <div className="progress-track h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="progress-fill h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {/* 리퀴드 글래스: 원형 진행률 */}
                  {theme === "glass" && (
                    <div
                      className="grid h-11 w-11 flex-none place-items-center rounded-full"
                      style={{
                        background: `conic-gradient(rgb(var(--accent-600)) ${progress}%, rgb(var(--accent-600) / 0.15) 0)`,
                      }}
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-[10px] font-bold text-stone-800">
                        {progress}%
                      </span>
                    </div>
                  )}
                </div>
                {/* 남은 분량 — 끝내지 않은 일이 눈에 보이면 이어 읽게 된다 */}
                {remainingLabel && (
                  <p className="mt-1.5 text-[11px] font-medium text-emerald-700">{remainingLabel}</p>
                )}
                {/* 네오 브루탈: 읽기 → 생각 → 독후감 단계 표시 */}
                {theme === "brutal" && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold">
                    {steps.map((s, i) => (
                      <span key={s.label} className="flex flex-1 items-center gap-1.5 last:flex-none">
                        <span
                          className="grid h-5 w-5 flex-none place-items-center rounded-full border-2 border-black"
                          style={{
                            background: s.done ? "#111" : i === currentStep ? "rgb(var(--second-400))" : "#fff",
                            color: s.done ? "#fff" : "#111",
                          }}
                        >
                          {s.done ? "✓" : i + 1}
                        </span>
                        <span>{s.label}</span>
                        {i < steps.length - 1 && <span className="h-0.5 flex-1 bg-black" />}
                      </span>
                    ))}
                  </div>
                )}
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
                  {ebookPage !== null && (
                    <span className="text-xs text-stone-500">
                      ≈ p. <b className="font-semibold text-stone-700">{ebookPage}</b> / {book.pageCount}
                    </span>
                  )}
                  <span className="ml-auto font-semibold text-emerald-700">{progress}%</span>
                </div>
                {isEbook && !book.pageCount && (
                  <p className="mt-1.5 text-[11px] text-stone-400">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="text-emerald-700 underline"
                    >
                      전체 페이지 수
                    </button>
                    를 입력하면 %를 페이지로 환산해 보여드려요.
                  </p>
                )}
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

      {showEditModal && (
        <EditBookModal
          book={currentBook}
          onClose={() => setShowEditModal(false)}
          onSave={(patch) => updateBook(currentBook.id, patch)}
        />
      )}

      {/* 탭 (스크롤 시 상단 고정) */}
      <div className="paper-texture sticky top-[38px] z-20 mt-3 flex gap-4 border-b border-stone-200 px-5">
        <button
          onClick={() => setTab("mindmap")}
          className={`pb-2 font-serif text-sm tracking-wide ${
            tab === "mindmap" ? "border-ink text-ink border-b-2 font-bold" : "text-stone-500"
          }`}
        >
          마인드맵
        </button>
        <button
          onClick={() => setTab("review")}
          className={`pb-2 font-serif text-sm tracking-wide ${
            tab === "review" ? "border-ink text-ink border-b-2 font-bold" : "text-stone-500"
          }`}
        >
          독후감
        </button>
      </div>

      {/* 콘텐츠: 마인드맵은 화면을 꽉 채우고, 위쪽 sticky 헤더/탭으로 정보로 복귀 가능 */}
      <div className="px-5 pb-6 pt-3">
        {tab === "mindmap" ? (
          <div
            className="w-full"
            style={{ height: shortLandscape ? "calc(100vh - 78px)" : "calc(100vh - 90px)" }}
          >
            <MindMapEditor bookId={bookId} />
          </div>
        ) : (
          <ReviewEditor bookId={bookId} />
        )}
      </div>

      <TouchScrollbar targetRef={scrollRef} />

      {exporting && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40">
          <div className="paper-card rounded-lg px-6 py-5 text-center">
            <p className="text-2xl">📄</p>
            <p className="mt-2 text-sm font-medium text-stone-700">{exporting}</p>
            <p className="mt-1 text-xs text-stone-400">잠시만 기다려 주세요</p>
          </div>
        </div>
      )}

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
