import { useState } from "react";
import type { Quote } from "../../types";

interface QuoteListProps {
  quotes: Quote[];
  onChange: (quotes: Quote[]) => void;
}

export default function QuoteList({ quotes, onChange }: QuoteListProps) {
  const [text, setText] = useState("");
  const [page, setPage] = useState("");

  function addQuote() {
    if (!text.trim()) return;
    onChange([...quotes, { id: crypto.randomUUID(), text: text.trim(), page: page.trim() || undefined }]);
    setText("");
    setPage("");
  }

  function removeQuote(id: string) {
    onChange(quotes.filter((q) => q.id !== id));
  }

  return (
    <div className="space-y-2">
      <h3 className="font-serif text-sm font-semibold text-stone-700">인상 깊은 문장</h3>
      <ul className="space-y-2">
        {quotes.map((q) => (
          <li key={q.id} className="flex items-start justify-between rounded bg-stone-100 p-2 text-sm">
            <div>
              <p className="italic text-stone-700">"{q.text}"</p>
              {q.page && <p className="text-xs text-stone-400">p.{q.page}</p>}
            </div>
            <button onClick={() => removeQuote(q.id)} className="text-stone-400 hover:text-red-600">
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="인용문 추가"
          className="flex-1 rounded border border-stone-300 px-2 py-1 text-sm"
        />
        <input
          value={page}
          onChange={(e) => setPage(e.target.value)}
          placeholder="페이지"
          className="w-20 rounded border border-stone-300 px-2 py-1 text-sm"
        />
        <button onClick={addQuote} className="rounded bg-stone-700 px-3 py-1 text-sm text-white hover:bg-stone-800">
          추가
        </button>
      </div>
    </div>
  );
}
