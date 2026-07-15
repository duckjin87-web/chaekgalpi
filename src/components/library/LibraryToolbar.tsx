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
        placeholder="검색"
        className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 text-sm"
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
      {showDateFilters && (
        <>
          <select
            value={yearFilter}
            onChange={(e) =>
              onYearFilterChange!(e.target.value === "전체" ? "전체" : Number(e.target.value))
            }
            className="rounded border border-stone-300 px-2 py-1.5 text-sm"
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
            className="rounded border border-stone-300 px-2 py-1.5 text-sm"
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
        className="bg-ink rounded-sm px-2.5 py-1 text-xs tracking-wide text-white shadow"
      >
        + 책 추가
      </button>
    </div>
  );
}
