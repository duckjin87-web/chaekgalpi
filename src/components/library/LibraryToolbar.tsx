import type { BookStatus } from "../../types";

interface LibraryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: BookStatus | "전체";
  onStatusFilterChange: (value: BookStatus | "전체") => void;
  onAddClick: () => void;
  years?: number[];
  yearFilter?: number | "전체";
  onYearFilterChange?: (value: number | "전체") => void;
  monthFilter?: number | "전체";
  onMonthFilterChange?: (value: number | "전체") => void;
}

export default function LibraryToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddClick,
  years,
  yearFilter,
  onYearFilterChange,
  monthFilter,
  onMonthFilterChange,
}: LibraryToolbarProps) {
  const showDateFilters = !!years && years.length > 0 && onYearFilterChange && onMonthFilterChange;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="제목·저자 검색"
        className="min-w-0 flex-1 rounded-sm border-2 border-[#1a54a6] bg-white px-2.5 py-1.5 text-sm outline-none placeholder:text-stone-400"
      />
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as BookStatus | "전체")}
        className="rounded-sm border border-[#d9e2ef] bg-white px-2 py-1.5 text-sm text-stone-700"
      >
        <option value="전체">전체</option>
        <option value="읽고싶음">읽고 싶음</option>
        <option value="읽는중">읽는 중</option>
        <option value="완독">완독</option>
      </select>
      {showDateFilters && (
        <>
          <select
            value={yearFilter}
            onChange={(e) =>
              onYearFilterChange!(e.target.value === "전체" ? "전체" : Number(e.target.value))
            }
            className="rounded-sm border border-[#d9e2ef] bg-white px-2 py-1.5 text-sm text-stone-700"
          >
            <option value="전체">연도 전체</option>
            {years!.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={monthFilter}
            onChange={(e) =>
              onMonthFilterChange!(e.target.value === "전체" ? "전체" : Number(e.target.value))
            }
            className="rounded-sm border border-[#d9e2ef] bg-white px-2 py-1.5 text-sm text-stone-700"
          >
            <option value="전체">월 전체</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </>
      )}
      <button
        onClick={onAddClick}
        className="bg-ink rounded-sm px-3 py-1.5 text-xs font-medium tracking-wide text-white"
      >
        + 책 추가
      </button>
    </div>
  );
}
