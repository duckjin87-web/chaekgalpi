/**
 * 수동 백업 유틸
 *
 * 책갈피의 모든 데이터는 브라우저 localStorage(`chaekgalpi-library`)에 저장된다.
 * 여기서는 그 내용을 파일로 내려받거나, 백업 파일로 되돌리는 기능만 제공한다.
 */

export const LIBRARY_KEY = "chaekgalpi-library";

export interface Counts {
  books: number;
  mindMaps: number;
  reviews: number;
  parsed: boolean;
}

/** 저장된 JSON 문자열에서 책/마인드맵/독후감 개수를 읽어낸다. */
export function countsOf(json: string | null): Counts {
  const empty: Counts = { books: 0, mindMaps: 0, reviews: 0, parsed: false };
  if (!json) return empty;
  try {
    const outer = JSON.parse(json);
    const state = outer?.state ?? outer;
    return {
      books: Array.isArray(state?.books) ? state.books.length : 0,
      mindMaps: Array.isArray(state?.mindMaps) ? state.mindMaps.length : 0,
      reviews: Array.isArray(state?.reviews) ? state.reviews.length : 0,
      parsed: true,
    };
  } catch {
    return empty;
  }
}

export function readRaw(): string | null {
  try {
    return localStorage.getItem(LIBRARY_KEY);
  } catch {
    return null;
  }
}

export function writeRaw(json: string) {
  localStorage.setItem(LIBRARY_KEY, json);
}

export function backupFileName() {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return `chaekgalpi-backup-${stamp}.json`;
}

export function downloadJson(json: string, filename = backupFileName()) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 백업 파일 내용이 책갈피 저장 형식인지 확인하고, 저장 가능한 문자열로 되돌린다. */
export function normalizeImport(text: string): string {
  const outer = JSON.parse(text);
  const state = outer?.state ?? outer;
  if (!state || !Array.isArray(state.books)) {
    throw new Error("책갈피 백업 파일이 아닙니다 (books 목록을 찾을 수 없음)");
  }
  // zustand persist 형식으로 통일
  const wrapped = outer?.state ? outer : { state, version: 0 };
  return JSON.stringify(wrapped);
}
