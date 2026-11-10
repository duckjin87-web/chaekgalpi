import {
  THEMES,
  activePalette,
  getThemeDef,
  setPalette,
  setTheme,
  useThemeSettings,
  type ThemeId,
} from "../../lib/appTheme";

/** 테마 카드 안의 작은 미리보기 — 각 테마의 생김새를 한눈에 */
function ThemePreview({ id }: { id: ThemeId }) {
  if (id === "glass") {
    return (
      <div
        className="flex h-14 items-end justify-center gap-1 rounded-xl p-1.5"
        style={{ background: "linear-gradient(135deg,#7fd6c8,#8fa8ff 60%,#dfe9ff)" }}
      >
        <div className="h-7 flex-1 rounded-lg border border-white/90 bg-white/60" />
        <div className="h-4 w-8 rounded-full bg-[#3451c7]" />
      </div>
    );
  }
  if (id === "brutal") {
    return (
      <div className="flex h-14 items-end justify-center gap-1.5 rounded-lg border-2 border-black bg-[#fff7d6] p-1.5">
        <div className="h-7 flex-1 rounded border-2 border-black bg-white shadow-[2px_2px_0_#111]" />
        <div className="h-5 w-5 rounded border-2 border-black bg-[#ffd84a] shadow-[2px_2px_0_#111]" />
      </div>
    );
  }
  return (
    <div className="flex h-14 items-end justify-center gap-1 rounded-md border border-[#e3dac8] bg-[#f6f1e7] p-1.5">
      <div className="h-7 flex-1 rounded-sm bg-white shadow" />
      <div className="h-8 w-2 rounded-sm bg-[#7a4b3a]" />
      <div className="h-6 w-2 rounded-sm bg-[#34586e]" />
      <div className="h-7 w-2 rounded-sm bg-[#c9a24a]" />
    </div>
  );
}

/** 테마 · 색상 배열 선택 (바텀시트) */
export default function ThemeSheet({ onClose }: { onClose: () => void }) {
  const settings = useThemeSettings();
  const def = getThemeDef(settings.theme);
  const palette = activePalette(settings);

  return (
    <div className="sheet-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="sheet w-full max-w-md rounded-t-3xl bg-white px-5 pt-3 text-stone-800 shadow-2xl"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">테마</h2>
          <button onClick={onClose} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
            닫기
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const on = t.id === settings.theme;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                aria-pressed={on}
                className={`rounded-2xl border-2 p-2 text-left transition-colors ${
                  on ? "border-stone-800 bg-stone-50" : "border-stone-200"
                }`}
              >
                <ThemePreview id={t.id} />
                <p className="mt-1.5 text-xs font-bold">{t.label}</p>
                <p className="text-[10px] leading-tight text-stone-500">{t.description}</p>
              </button>
            );
          })}
        </div>

        <h3 className="mb-2 mt-4 text-sm font-bold">
          색상 배열 <span className="font-normal text-stone-400">· {def.label}</span>
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {def.palettes.map((p) => {
            const on = p.id === palette.id;
            return (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                aria-pressed={on}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-1 py-2 ${
                  on ? "border-stone-800 bg-stone-50" : "border-stone-200"
                }`}
              >
                <span className="flex">
                  {p.swatch.map((c, i) => (
                    <span
                      key={i}
                      className="-ml-1.5 h-6 w-6 rounded-full border-2 border-white first:ml-0"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                <span className="text-[11px] font-semibold">{p.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
          고르는 즉시 적용되고, 마인드맵 모양도 테마를 따라 바뀝니다. 설정은 이 기기에 저장됩니다.
        </p>
      </div>
    </div>
  );
}
