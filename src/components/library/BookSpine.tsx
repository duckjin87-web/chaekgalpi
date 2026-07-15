import { Link } from "react-router-dom";
import type { Book } from "../../types";

interface BookSpineProps {
  book: Book;
  compact?: boolean;
}

function stableHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 실제 하드커버 도서 톤의 뉴트럴 팔레트 (배경색 + 글자색) */
const SPINE_STYLES: { bg: string; fg: string }[] = [
  { bg: "#1c2340", fg: "#e5dcbf" }, // 다크 네이비 + 크림
  { bg: "#e8dcb5", fg: "#2a2620" }, // 크림 + 다크 브라운
  { bg: "#7f8a99", fg: "#f4f0e5" }, // 그레이 블루 + 크림
  { bg: "#1a1a1a", fg: "#e5dcbf" }, // 블랙 + 크림
  { bg: "#eae4d0", fg: "#2a2620" }, // 오프화이트 + 다크
  { bg: "#3a4258", fg: "#e5dcbf" }, // 미드 네이비 + 크림
  { bg: "#b09779", fg: "#2a2620" }, // 베이지 + 다크
  { bg: "#2c3a30", fg: "#e5dcbf" }, // 다크 그린 + 크림
];

export default function BookSpine({ book, compact }: BookSpineProps) {
  const h = stableHash(book.id);
  const style = SPINE_STYLES[h % SPINE_STYLES.length];
  const width = (compact ? 26 : 32) + (h % 5); // 자연스러운 두께 변주
  const height = compact ? 108 : 128 - (h % 8);
  const rotate = ((h % 5) - 2) * 0.4; // 살짝만 기울임

  return (
    <Link
      to={`/book/${book.id}`}
      className="book-spine group flex flex-shrink-0 flex-col items-center justify-start transition-transform hover:-translate-y-1"
      style={{
        width,
        height,
        backgroundColor: style.bg,
        color: style.fg,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "bottom center",
      }}
      title={`${book.title}${book.author ? ` — ${book.author}` : ""}`}
    >
      <span className="book-spine-title">{book.title}</span>
      {book.author && <span className="book-spine-author">{book.author}</span>}
    </Link>
  );
}
