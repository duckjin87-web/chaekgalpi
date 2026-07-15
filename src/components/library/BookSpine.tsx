import { Link } from "react-router-dom";
import type { Book } from "../../types";

interface BookSpineProps {
  book: Book;
  compact?: boolean;
}

/** 책 id 기반 안정적 해시 → 색/기울기/두께 변주에 사용 */
function stableHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// 진한 계열의 책등 색 팔레트 (실제 하드커버 도서의 색감)
const SPINE_COLORS = [
  "#2a4a6a",
  "#5a2a3a",
  "#3a5a3a",
  "#6b2f2a",
  "#4a3a5a",
  "#5a4a2a",
  "#2a5f5a",
  "#7a4a2a",
  "#3a3a5a",
  "#5a3a2a",
];

export default function BookSpine({ book, compact }: BookSpineProps) {
  const h = stableHash(book.id);
  const color = SPINE_COLORS[h % SPINE_COLORS.length];
  const width = (compact ? 22 : 28) + (h % 6); // 22~33px 사이 변주
  const height = compact ? 96 : 118 - (h % 8); // 살짝씩 다른 높이
  const rotate = ((h % 5) - 2) * 0.6; // -1.2 ~ 1.2도 미세 기울기

  return (
    <Link
      to={`/book/${book.id}`}
      className="book-spine group flex flex-shrink-0 flex-col items-center justify-center transition-transform hover:-translate-y-1"
      style={{
        width,
        height,
        backgroundColor: color,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "bottom center",
      }}
      title={book.title}
    >
      <span className="book-spine-title">{book.title}</span>
    </Link>
  );
}
