import type { BookStatus } from "../../types";

interface LibraryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: BookStatus | "전체";
  onStatusFilterChange: (value: BookStatus | "전체") => void;
  onAddClick: () => void;
}

export default function LibraryToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddClick,
}: LibraryToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="제목, 저자, 태그 검색"
        className="rounded border border-stone-300 px-3 py-1.5 text-sm"
      />
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as BookStatus | "전체")}
        className="rounded border border-stone-300 px-2 py-1.5 text-sm"
      >
        <option value="전체">전체</option>
        <option value="읽고싶음">읽고 싶음</option>
        <option value="읽는중">읽는 중</option>
        <option value="완독">완독</option>
      </select>
      <button
        onClick={onAddClick}
        className="ml-auto rounded bg-emerald-800 px-3 py-1.5 text-sm text-white hover:bg-emerald-900"
      >
        + 책 추가
      </button>
    </div>
  );
}
