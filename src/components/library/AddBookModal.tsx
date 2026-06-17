import { useState } from "react";
import type { Book, BookStatus } from "../../types";

interface AddBookModalProps {
  onClose: () => void;
  onAdd: (book: Omit<Book, "id" | "createdAt">) => void;
}

export default function AddBookModal({ onClose, onAdd }: AddBookModalProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<BookStatus>("읽고싶음");
  const [tagsInput, setTagsInput] = useState("");

  function handleSubmit() {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      author: author.trim(),
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
          <input
            autoFocus
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
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
