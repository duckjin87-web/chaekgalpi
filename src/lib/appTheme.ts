import { useSyncExternalStore } from "react";

/**
 * 앱 테마 · 색상 배열
 *
 * 테마는 <html data-theme="…">, 색상 배열은 CSS 변수로 적용한다.
 * 컴포넌트의 emerald-*(강조색) · amber-*(보조색) 클래스가 이 변수를 따라가도록
 * tailwind.config.js 에서 연결해 두었기 때문에, 화면 코드를 고치지 않고도 색이 바뀐다.
 */

export type ThemeId = "journal" | "paper" | "glass" | "brutal";

export interface Palette {
  id: string;
  label: string;
  /** 강조색 (버튼 · 진행 표시) */
  accent: string;
  /** 보조색 (메모 · 포인트) */
  second: string;
  /** 제목 · 굵은 선 */
  ink: string;
  /** 화면 바탕 (테마별로 쓰임이 다르다) */
  page: string[];
  /** 테마 메뉴에 보여줄 견본 */
  swatch: string[];
}

export interface ThemeDef {
  id: ThemeId;
  label: string;
  description: string;
  palettes: Palette[];
}

export const THEMES: ThemeDef[] = [
  {
    id: "journal",
    label: "저널",
    description: "애플 기본 앱처럼 깔끔한 카드",
    palettes: [
      { id: "blue", label: "블루", accent: "#007aff", second: "#ff9500", ink: "#000000", page: ["#f2f2f7"], swatch: ["#007aff", "#ff9500", "#f2f2f7"] },
      { id: "green", label: "그린", accent: "#248a3d", second: "#ff9500", ink: "#000000", page: ["#f2f2f7"], swatch: ["#34c759", "#ff9500", "#f2f2f7"] },
      { id: "purple", label: "퍼플", accent: "#8944ab", second: "#ff9f0a", ink: "#000000", page: ["#f2f2f7"], swatch: ["#af52de", "#ff9f0a", "#f2f2f7"] },
      { id: "graphite", label: "그라파이트", accent: "#3a3a3c", second: "#ff9500", ink: "#000000", page: ["#f2f2f7"], swatch: ["#3a3a3c", "#ff9500", "#f2f2f7"] },
    ],
  },
  {
    id: "paper",
    label: "종이 서재",
    description: "따뜻한 종이와 나무 책장",
    palettes: [
      { id: "forest", label: "숲", accent: "#047857", second: "#f59e0b", ink: "#22335a", page: ["#ffffff"], swatch: ["#047857", "#f59e0b", "#22335a"] },
      { id: "ocean", label: "바다", accent: "#1d4f91", second: "#e0a43a", ink: "#1b2a4a", page: ["#fbfcff"], swatch: ["#1d4f91", "#e0a43a", "#1b2a4a"] },
      { id: "plum", label: "자두", accent: "#6b3fa0", second: "#d99a2b", ink: "#33264d", page: ["#fdfbff"], swatch: ["#6b3fa0", "#d99a2b", "#33264d"] },
      { id: "mocha", label: "모카", accent: "#7a4b2a", second: "#c98f2b", ink: "#3b2a1e", page: ["#fffdf9"], swatch: ["#7a4b2a", "#c98f2b", "#3b2a1e"] },
    ],
  },
  {
    id: "glass",
    label: "리퀴드 글래스",
    description: "반투명 유리와 맑은 그라데이션",
    palettes: [
      { id: "dawn", label: "새벽", accent: "#3451c7", second: "#27b6c9", ink: "#18223d", page: ["#7fd6c8", "#8fa8ff", "#dfe9ff"], swatch: ["#7fd6c8", "#8fa8ff", "#3451c7"] },
      { id: "lavender", label: "라벤더", accent: "#6d45c9", second: "#e06aa9", ink: "#2a1f4d", page: ["#f3b6dc", "#b9a5ff", "#ece6ff"], swatch: ["#f3b6dc", "#b9a5ff", "#6d45c9"] },
      { id: "mint", label: "민트", accent: "#0f7f73", second: "#4c9be8", ink: "#10302c", page: ["#a8ecc9", "#8fd3e8", "#e2f7f1"], swatch: ["#a8ecc9", "#8fd3e8", "#0f7f73"] },
      { id: "sunset", label: "노을", accent: "#c2512f", second: "#e8a13a", ink: "#3d1f1a", page: ["#ffc9a3", "#f7a8c4", "#fff0e6"], swatch: ["#ffc9a3", "#f7a8c4", "#c2512f"] },
    ],
  },
  {
    id: "brutal",
    label: "네오 브루탈",
    description: "굵은 선과 선명한 원색",
    palettes: [
      { id: "lemon", label: "레몬", accent: "#6f8cff", second: "#ffd84a", ink: "#111111", page: ["#fff7d6", "#ff8fd0"], swatch: ["#ffd84a", "#6f8cff", "#ff8fd0"] },
      { id: "mint", label: "민트", accent: "#4fd3a3", second: "#ffd84a", ink: "#111111", page: ["#eafff5", "#6f8cff"], swatch: ["#4fd3a3", "#ffd84a", "#6f8cff"] },
      { id: "lilac", label: "라일락", accent: "#b48cff", second: "#7ce0b6", ink: "#111111", page: ["#f6efff", "#ffd84a"], swatch: ["#b48cff", "#7ce0b6", "#ffd84a"] },
      { id: "orange", label: "오렌지", accent: "#ff9f5a", second: "#6fc3ff", ink: "#111111", page: ["#fff1e3", "#ffd84a"], swatch: ["#ff9f5a", "#6fc3ff", "#ffd84a"] },
    ],
  },
];

export interface ThemeSettings {
  /** 설정 형식 버전 — 2부터 저널이 기본 */
  v?: number;
  theme: ThemeId;
  /** 테마별로 마지막에 고른 색상 배열 */
  palettes: Partial<Record<ThemeId, string>>;
}

const KEY = "chaekgalpi-theme";
const DEFAULT: ThemeSettings = { v: 2, theme: "journal", palettes: {} };

function load(): ThemeSettings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const palettes = typeof s.palettes === "object" && s.palettes ? s.palettes : {};
    // 저널 디자인으로 바꾼 뒤 처음 열 때는 저널로 시작한다 (이전 선택은 테마 메뉴에서 다시 고를 수 있다)
    if (s.v !== 2) return { v: 2, theme: "journal", palettes };
    return { v: 2, theme: THEMES.some((t) => t.id === s.theme) ? s.theme : "journal", palettes };
  } catch {
    return DEFAULT;
  }
}

let current: ThemeSettings = DEFAULT;
const listeners = new Set<() => void>();

export function getThemeDef(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function activePalette(settings: ThemeSettings = current): Palette {
  const def = getThemeDef(settings.theme);
  return def.palettes.find((p) => p.id === settings.palettes[settings.theme]) ?? def.palettes[0];
}

/* ── 색 계산: 기준색 하나로 50~900 단계를 만든다 ── */

const LEVELS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
/** +면 흰색 쪽, -면 검정 쪽으로 섞는 비율. 기준색이 700 자리(강조) / 500 자리(보조)일 때 */
const MIX_FROM_700 = [0.93, 0.86, 0.72, 0.55, 0.36, 0.2, 0.09, 0, -0.15, -0.3];
const MIX_FROM_500 = [0.9, 0.8, 0.62, 0.42, 0.2, 0, -0.12, -0.26, -0.4, -0.52];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function mix(rgb: [number, number, number], t: number): string {
  const target = t >= 0 ? 255 : 0;
  const k = Math.abs(t);
  return rgb.map((c) => Math.round(c + (target - c) * k)).join(" ");
}

function apply(settings: ThemeSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const palette = activePalette(settings);
  root.dataset.theme = settings.theme;

  // 종이 서재의 기본 배열은 원래 색 그대로 쓴다 (변수 제거 → CSS 기본값)
  const untouched = settings.theme === "paper" && palette.id === "forest";
  const accent = hexToRgb(palette.accent);
  const second = hexToRgb(palette.second);
  LEVELS.forEach((level, i) => {
    if (untouched) {
      root.style.removeProperty(`--accent-${level}`);
      root.style.removeProperty(`--second-${level}`);
    } else {
      root.style.setProperty(`--accent-${level}`, mix(accent, MIX_FROM_700[i]));
      root.style.setProperty(`--second-${level}`, mix(second, MIX_FROM_500[i]));
    }
  });
  root.style.setProperty("--ink", palette.ink);
  palette.page.forEach((c, i) => root.style.setProperty(`--page-${i + 1}`, c));

  // 브라우저 상단 바 색도 테마에 맞춘다
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", settings.theme === "paper" ? palette.accent : palette.page[0]);
}

function commit(next: ThemeSettings) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 저장 실패해도 이번 실행 동안은 적용된다 */
  }
  apply(next);
  listeners.forEach((l) => l());
}

/** 앱 시작 시 한 번: 저장된 테마를 화면이 그려지기 전에 적용 */
export function initTheme() {
  current = load();
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* noop */
  }
  apply(current);
}

export function setTheme(theme: ThemeId) {
  commit({ ...current, theme });
}

export function setPalette(paletteId: string) {
  commit({ ...current, palettes: { ...current.palettes, [current.theme]: paletteId } });
}

export function useThemeSettings(): ThemeSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current
  );
}
