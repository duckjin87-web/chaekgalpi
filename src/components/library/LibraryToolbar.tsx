import type { BookStatus } from "../../types";

const STATUS_OPTIONS: { value: BookStatus | "전체"; label: string }[] = [
  { value: "전체", label: "전체" },
  { value: "읽는중", label: "읽는 중" },
  { value: "읽고싶음", label: "읽고 싶음" },
  { value: "완독", label: "완독" },
];

interface LibraryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: BookStatus | "전체";
  onStatusFilterChange: (value: BookStatus | "전체") => void;
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
  years,
  yearFilter,
  onYearFilterChange,
  monthFilter,
  onMonthFilterChange,
}: LibraryToolbarProps) {
  const showDateFilters = !!years && years.length > 0 && onYearFilterChange && onMonthFilterChange;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {/* iOS 검색 막대 */}
      <label className="search-bar flex min-w-0 flex-[1_1_100%] items-center gap-1.5 rounded-xl bg-stone-200/70 px-2.5">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5L20 20" />
        </svg>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="제목, 저자, 태그 검색"
          aria-label="책 검색"
          className="h-9 min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-stone-400"
        />
      </label>
      {/* iOS 세그먼트 컨트롤 */}
      <div role="radiogroup" aria-label="읽기 상태" className="segmented flex flex-[1_1_100%] rounded-[9px] bg-stone-200/70 p-0.5">
        {STATUS_OPTIONS.map((o) => {
          const on = statusFilter === o.value;
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={on}
              onClick={() => onStatusFilterChange(o.value)}
              className={`h-8 flex-1 rounded-[7px] text-[13px] transition-all ${
                on ? "bg-white font-semibold text-stone-900 shadow-sm" : "font-medium text-stone-600"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
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
    </div>
  );
}
