/**
 * 데이터 보호 · 복구 유틸
 *
 * 책갈피의 모든 데이터는 브라우저 localStorage(`chaekgalpi-library`) 한 곳에만
 * 저장된다. localStorage는 용량이 약 5MB뿐이고, iOS/안드로이드 브라우저가
 * 저장공간을 정리할 때 통째로 비워버릴 수도 있다. 그래서 여기서는
 *
 *   1) 저장될 때마다 같은 내용을 IndexedDB에 스냅샷으로 한 벌 더 남기고
 *      (IndexedDB는 용량이 훨씬 크고 쉽게 지워지지 않는다)
 *   2) localStorage 쓰기가 실패하면(용량 초과 등) 조용히 넘기지 않고 알리고
 *   3) 데이터가 비어 보이면 스냅샷에서 되돌릴 수 있게 한다.
 */

export const LIBRARY_KEY = "chaekgalpi-library";

const DB_NAME = "chaekgalpi-backup";
const DB_VERSION = 1;
const STORE = "snapshots";
/** 최근 스냅샷 보관 개수 (이보다 오래된 것도 '가장 알찬' 스냅샷은 지우지 않는다) */
const MAX_SNAPSHOTS = 12;

export interface SnapshotMeta {
  id: number;
  ts: string;
  size: number;
  books: number;
  mindMaps: number;
  reviews: number;
}
export interface Snapshot extends SnapshotMeta {
  json: string;
}

/* ------------------------------------------------------------------ */
/* 내용 파악                                                           */
/* ------------------------------------------------------------------ */

export interface Counts {
  books: number;
  mindMaps: number;
  reviews: number;
  titles: string[];
  parsed: boolean;
}

/** 저장된 JSON 문자열에서 책/마인드맵/독후감 개수를 읽어낸다. */
export function countsOf(json: string | null): Counts {
  const empty: Counts = { books: 0, mindMaps: 0, reviews: 0, titles: [], parsed: false };
  if (!json) return empty;
  try {
    const outer = JSON.parse(json);
    const state = outer?.state ?? outer;
    const books = Array.isArray(state?.books) ? state.books : [];
    return {
      books: books.length,
      mindMaps: Array.isArray(state?.mindMaps) ? state.mindMaps.length : 0,
      reviews: Array.isArray(state?.reviews) ? state.reviews.length : 0,
      titles: books.map((b: { title?: string }) => b?.title ?? "(제목 없음)"),
      parsed: true,
    };
  } catch {
    return empty;
  }
}

/** 기본 예시 데이터(사피엔스 · 어린 왕자)만 들어있는 상태인지 */
export function looksLikeSeed(counts: Counts): boolean {
  if (!counts.parsed) return false;
  if (counts.books === 0) return true;
  if (counts.books > 2) return false;
  const t = counts.titles.join("|");
  return t === "사피엔스|어린 왕자" || t === "사피엔스" || t === "어린 왕자";
}

/* ------------------------------------------------------------------ */
/* localStorage 직접 접근                                              */
/* ------------------------------------------------------------------ */

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

export interface KeyUsage {
  key: string;
  bytes: number;
}

/** localStorage에 들어있는 모든 키와 대략적인 바이트 수 */
export function localStorageUsage(): { total: number; keys: KeyUsage[] } {
  const keys: KeyUsage[] = [];
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key == null) continue;
      const value = localStorage.getItem(key) ?? "";
      // UTF-16 저장이라 문자 수 × 2가 실제 소비량에 가깝다
      const bytes = (key.length + value.length) * 2;
      keys.push({ key, bytes });
      total += bytes;
    }
  } catch {
    /* 접근 자체가 막힌 경우 */
  }
  keys.sort((a, b) => b.bytes - a.bytes);
  return { total, keys };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/* ------------------------------------------------------------------ */
/* IndexedDB 스냅샷                                                    */
/* ------------------------------------------------------------------ */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB 사용 불가"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB 열기 실패"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("indexedDB 트랜잭션 실패"));
    tx.onabort = () => reject(tx.error ?? new Error("indexedDB 트랜잭션 중단"));
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB 요청 실패"));
  });
}

/** 모든 스냅샷 (최신순) */
export async function listSnapshots(): Promise<Snapshot[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const all = await reqResult(tx.objectStore(STORE).getAll() as IDBRequest<Snapshot[]>);
    db.close();
    return all.sort((a, b) => b.id - a.id);
  } catch {
    return [];
  }
}

/** 가장 많은 책이 들어있는 스냅샷 (복구 후보) */
export async function richestSnapshot(): Promise<Snapshot | null> {
  const all = await listSnapshots();
  if (!all.length) return null;
  return all.reduce((best, s) => {
    const score = (x: Snapshot) => x.books * 100 + x.mindMaps + x.reviews;
    if (score(s) > score(best)) return s;
    if (score(s) === score(best) && s.id > best.id) return s;
    return best;
  });
}

/**
 * 저장 내용을 스냅샷으로 남긴다.
 * - 직전 스냅샷과 내용이 같으면 건너뛴다.
 * - 오래된 스냅샷은 정리하되, '가장 알찬' 스냅샷은 절대 지우지 않는다.
 */
export async function saveSnapshot(json: string): Promise<void> {
  const counts = countsOf(json);
  if (!counts.parsed) return; // 깨진 내용을 백업으로 덮지 않는다

  try {
    const db = await openDb();
    const existing = await (async () => {
      const tx = db.transaction(STORE, "readonly");
      const all = await reqResult(tx.objectStore(STORE).getAll() as IDBRequest<Snapshot[]>);
      return all.sort((a, b) => b.id - a.id);
    })();

    if (existing[0]?.json === json) {
      db.close();
      return;
    }

    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.add({
      ts: new Date().toISOString(),
      size: json.length * 2,
      books: counts.books,
      mindMaps: counts.mindMaps,
      reviews: counts.reviews,
      json,
    });

    // 정리: 최신 MAX_SNAPSHOTS개는 남기고, 그보다 오래된 것 중
    // 보관 대상보다 책이 더 많은 스냅샷은 보호한다.
    const score = (x: { books: number; mindMaps: number; reviews: number }) =>
      x.books * 100 + x.mindMaps + x.reviews;
    const keepRecent = existing.slice(0, MAX_SNAPSHOTS - 1);
    const older = existing.slice(MAX_SNAPSHOTS - 1);
    const bestKeptScore = Math.max(score(counts), ...keepRecent.map(score), 0);
    for (const old of older) {
      if (score(old) > bestKeptScore) continue; // 더 알찬 과거 데이터는 보존
      store.delete(old.id);
    }

    await txDone(tx);
    db.close();
  } catch {
    /* 백업 실패는 앱 동작을 막지 않는다 */
  }
}

export async function deleteSnapshot(id: number): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
    db.close();
  } catch {
    /* noop */
  }
}

/* ------------------------------------------------------------------ */
/* 내보내기 / 가져오기                                                 */
/* ------------------------------------------------------------------ */

export function downloadJson(json: string, filename?: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `책갈피-백업-${stamp}.json`;
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
