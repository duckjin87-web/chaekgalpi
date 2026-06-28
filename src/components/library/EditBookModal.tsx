import { useState } from "react";
import type { Book, BookStatus } from "../../types";

interface EditBookModalProps {
  book: Book;
  onClose: () => void;
  onSave: (patch: Partial<Book>) => void;
}

export default function EditBookModal({ book, onClose, onSave }: EditBookModalProps) {
  const [author, setAuthor] = useState(book.author);
  const [pageCount, setPageCount] = useState(book.pageCount ? String(book.pageCount) : "");
  const [currentPage, setCurrentPage] = useState(book.currentPage ? String(book.currentPage) : "");
  const [publisher, setPublisher] = useState(book.publisher ?? "");
  const [publishedDate, setPublishedDate] = useState(book.publishedDate ?? "");
  const [status, setStatus] = useState<BookStatus>(book.status);

  function handleSubmit() {
    onSave({
      author: author.trim(),
      pageCount: pageCount ? Number(pageCount) : undefined,
      currentPage: currentPage ? Number(currentPage) : undefined,
      publisher: publisher.trim() || undefined,
      publishedDate: publishedDate.trim() || undefined,
      status,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="max-h-[90vh] w-80 space-y-3 overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <h2 className="font-serif text-lg text-stone-800">책 정보 수정</h2>
        <p className="text-sm text-stone-500">{book.title}</p>
        <div>
          <label className="block text-xs font-medium text-stone-600">저자</label>
          <input
            autoFocus
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">출판사</label>
          <input
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-600">전체 페이지</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-600">현재 페이지</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
              value={currentPage}
              onChange={(e) => setCurrentPage(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">출판일</label>
          <input
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={publishedDate}
            onChange={(e) => setPublishedDate(e.target.value)}
            placeholder="2020"
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
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded px-3 py-1 text-sm text-stone-500 hover:bg-stone-100">
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="rounded bg-emerald-800 px-3 py-1 text-sm text-white hover:bg-emerald-900"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
