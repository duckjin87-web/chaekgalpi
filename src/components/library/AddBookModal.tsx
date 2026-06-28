import { useEffect, useRef, useState } from "react";
import type { Book, BookStatus, ReadingPrompts } from "../../types";
import { searchBooksByTitle, fetchBookByIsbn, type BookSearchResult } from "../../lib/bookSearch";
import { fetchReadingPrompts } from "../../lib/readingPrompts";

interface AddBookModalProps {
  onClose: () => void;
  onAdd: (book: Omit<Book, "id" | "createdAt">) => void;
}

export default function AddBookModal({ onClose, onAdd }: AddBookModalProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [isbn, setIsbn] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<BookStatus>("읽고싶음");
  const [tagsInput, setTagsInput] = useState("");

  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const lastAppliedTitle = useRef<string | null>(null);

  // 몰입형 독서 생각거리 (Gemini AI 우선, 실패 시 로컬 생성기 폴백)
  const [prompts, setPrompts] = useState<ReadingPrompts | null>(null);
  const [promptsSource, setPromptsSource] = useState<"ai" | "local" | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const bookMetaRef = useRef<{ description?: string; categories?: string[] }>({});
  const [toc, setToc] = useState<string[] | undefined>(undefined);

  async function suggestPrompts(meta?: { title: string; author: string; description?: string; categories?: string[] }) {
    const src = meta ?? {
      title,
      author,
      description: bookMetaRef.current.description,
      categories: bookMetaRef.current.categories,
    };
    if (!src.title.trim()) return;
    setPromptsLoading(true);
    try {
      const { prompts: p, source } = await fetchReadingPrompts(src);
      setPrompts(p);
      setPromptsSource(source);
    } finally {
      setPromptsLoading(false);
    }
  }

  useEffect(() => {
    if (title.trim().length < 2 || title === lastAppliedTitle.current) return;
    const timer = window.setTimeout(() => {
      handleSearch();
    }, 600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  async function handleSearch() {
    if (!title.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const found = await searchBooksByTitle(title);
      setResults(found);
      if (found.length === 0) setSearchError("검색 결과가 없어요. 직접 입력해주세요.");
    } catch {
      setSearchError("검색에 실패했어요. 직접 입력해주세요.");
    } finally {
      setSearching(false);
    }
  }

  function applyResult(result: BookSearchResult) {
    lastAppliedTitle.current = result.title;
    setTitle(result.title);
    setAuthor(result.author);
    setCoverUrl(result.coverUrl);
    if (result.pageCount) setPageCount(String(result.pageCount));
    setPublisher(result.publisher ?? "");
    setPublishedDate(result.publishedDate ?? "");
    setIsbn(result.isbn ?? "");
    setToc(result.toc);
    setResults([]);
    bookMetaRef.current = { description: result.description, categories: result.categories };
    // 책을 선택하면 실제 책 정보로 AI 생각거리를 자동 제안
    void suggestPrompts({
      title: result.title,
      author: result.author,
      description: result.description,
      categories: result.categories,
    });
    // ISBN으로 페이지수·목차 등 상세 정보 보강 (검색 목록엔 없을 수 있음)
    if (result.isbn) {
      void fetchBookByIsbn(result.isbn).then((detail) => {
        if (!detail) return;
        if (detail.pageCount) setPageCount((p) => p || String(detail.pageCount));
        if (detail.publisher) setPublisher((p) => p || detail.publisher!);
        if (detail.publishedDate) setPublishedDate((p) => p || detail.publishedDate!);
        if (detail.toc?.length) setToc(detail.toc);
        if (detail.description) bookMetaRef.current.description = detail.description;
      });
    }
  }

  function handleSubmit() {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      author: author.trim(),
      coverUrl,
      pageCount: pageCount ? Number(pageCount) : undefined,
      publisher: publisher.trim() || undefined,
      publishedDate: publishedDate.trim() || undefined,
      isbn: isbn.trim() || undefined,
      description: bookMetaRef.current.description,
      toc: toc && toc.length ? toc : undefined,
      status,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      readingPrompts: prompts ?? undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="max-h-[90vh] w-80 space-y-3 overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <h2 className="font-serif text-lg text-stone-800">책 추가</h2>
        <div>
          <label className="block text-xs font-medium text-stone-600">제목</label>
          <div className="mt-1 flex gap-1">
            <input
              autoFocus
              className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !title.trim()}
              className="shrink-0 rounded bg-stone-700 px-2 py-1 text-xs text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {searching ? "검색중…" : "검색"}
            </button>
          </div>
          {searchError && <p className="mt-1 text-xs text-red-500">{searchError}</p>}
          {results.length > 0 && (
            <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded border border-stone-200 p-1">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => applyResult(r)}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs hover:bg-stone-100"
                  >
                    {r.coverUrl && (
                      <img src={r.coverUrl} alt={r.title} className="h-8 w-6 shrink-0 object-cover" />
                    )}
                    <span className="truncate">
                      <span className="font-medium text-stone-800">{r.title}</span>
                      {r.author && <span className="text-stone-500"> · {r.author}</span>}
                      {r.publisher && <span className="text-stone-400"> · {r.publisher}</span>}
                      {r.pageCount ? <span className="text-stone-400"> · {r.pageCount}p</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">저자</label>
          <input
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-600">페이지 수</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-600">출판일</label>
            <input
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
              value={publishedDate}
              onChange={(e) => setPublishedDate(e.target.value)}
              placeholder="2020"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">출판사</label>
          <input
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">ISBN</label>
          <input
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="검색 시 자동 입력"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">상태</label>
          <select
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as BookStatus)}
          >
            <option value="읽고싶음">읽고 싶음</option>
            <option value="읽는중">읽는 중</option>
            <option value="완독">완독</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">태그 (쉼표로 구분)</label>
          <input
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="인문, 소설"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-stone-600">
              읽기 전 생각거리
              {promptsSource === "ai" && <span className="ml-1 text-[10px] text-emerald-600">· AI</span>}
              {promptsSource === "local" && <span className="ml-1 text-[10px] text-stone-400">· 기본</span>}
            </label>
            <button
              type="button"
              onClick={() => suggestPrompts()}
              disabled={!title.trim() || promptsLoading}
              className="rounded px-1.5 py-0.5 text-[11px] text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
            >
              {promptsLoading ? "생성중…" : prompts ? "다시 제안 ↻" : "제안 받기"}
            </button>
          </div>
          {promptsLoading ? (
            <p className="mt-1 text-[11px] text-emerald-600">AI가 이 책에 맞는 질문을 만들고 있어요…</p>
          ) : prompts ? (
            <div className="mt-1 space-y-1.5 rounded border border-emerald-100 bg-emerald-50/60 p-2 text-xs text-stone-700">
              <p>
                <span className="mr-1 font-medium text-emerald-800">Q1.</span>
                {prompts.questions[0]}
              </p>
              <p>
                <span className="mr-1 font-medium text-emerald-800">Q2.</span>
                {prompts.questions[1]}
              </p>
              <p className="border-t border-emerald-100 pt-1.5">
                <span className="mr-1 font-medium text-amber-700">핵심 주제.</span>
                {prompts.coreTheme}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-stone-400">
              책을 검색해 선택하거나 제목 입력 후 '제안 받기'를 누르면 몰입형 질문을 제안해드려요.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded px-3 py-1 text-sm text-stone-500 hover:bg-stone-100">
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="rounded bg-emerald-800 px-3 py-1 text-sm text-white hover:bg-emerald-900"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
