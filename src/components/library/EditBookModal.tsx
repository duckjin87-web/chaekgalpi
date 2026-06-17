import { useState } from "react";
import type { Book } from "../../types";

interface EditBookModalProps {
  book: Book;
  onClose: () => void;
  onSave: (patch: Partial<Book>) => void;
}

export default function EditBookModal({ book, onClose, onSave }: EditBookModalProps) {
  const [author, setAuthor] = useState(book.author);
  const [pageCount, setPageCount] = useState(book.pageCount ? String(book.pageCount) : "");

  function handleSubmit() {
    onSave({
      author: author.trim(),
      pageCount: pageCount ? Number(pageCount) : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-80 space-y-3 rounded-md bg-white p-5 shadow-xl">
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
          <label className="block text-xs font-medium text-stone-600">페이지 수</label>
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
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
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
