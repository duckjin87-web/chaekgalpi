import { useState } from "react";
import type { Book, BookStatus } from "../../types";
import { searchBooksByTitle, type BookSearchResult } from "../../lib/bookSearch";

interface AddBookModalProps {
  onClose: () => void;
  onAdd: (book: Omit<Book, "id" | "createdAt">) => void;
}

export default function AddBookModal({ onClose, onAdd }: AddBookModalProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<BookStatus>("읽고싶음");
  const [tagsInput, setTagsInput] = useState("");

  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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
    setTitle(result.title);
    setAuthor(result.author);
    setCoverUrl(result.coverUrl);
    if (result.pageCount) setPageCount(String(result.pageCount));
    setResults([]);
  }

  function handleSubmit() {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      author: author.trim(),
      coverUrl,
      pageCount: pageCount ? Number(pageCount) : undefined,
      status,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-80 space-y-3 rounded-md bg-white p-5 shadow-xl">
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
              {searching ? "검색중" : "검색"}
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
        <div>
          <label className="block text-xs font-medium text-stone-600">페이지 수</label>
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
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
