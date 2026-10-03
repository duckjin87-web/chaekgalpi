import { createJSONStorage } from "zustand/middleware";
import { saveSnapshot } from "./backup";

/** localStorage 쓰기가 실패했을 때 발생하는 이벤트 이름 */
export const STORAGE_ERROR_EVENT = "chaekgalpi:storage-error";

export interface StorageErrorDetail {
  name: string;
  message: string;
  bytes: number;
}

/** 마지막 쓰기 실패 정보 (복구 화면에서 보여준다) */
export let lastStorageError: StorageErrorDetail | null = null;

let pending: string | null = null;
let timer: number | null = null;

/** IndexedDB 백업은 잦은 저장에 끌려다니지 않게 모아서 쓴다. */
function scheduleSnapshot(value: string) {
  pending = value;
  if (timer != null) return;
  timer = window.setTimeout(() => {
    timer = null;
    const v = pending;
    pending = null;
    if (v) void saveSnapshot(v);
  }, 4000);
}

/** 탭을 닫거나 백그라운드로 보낼 때 대기 중인 백업을 즉시 기록 */
function flushSnapshot() {
  if (timer != null) {
    window.clearTimeout(timer);
    timer = null;
  }
  const v = pending;
  pending = null;
  if (v) void saveSnapshot(v);
}

if (typeof window !== "undefined") {
  // 앱을 열자마자 지금 저장돼 있는 내용을 한 벌 백업해 둔다
  // (아무것도 수정하지 않고 닫아도 백업이 남도록)
  try {
    const existing = localStorage.getItem("chaekgalpi-library");
    if (existing) void saveSnapshot(existing);
  } catch {
    /* noop */
  }

  window.addEventListener("pagehide", flushSnapshot);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSnapshot();
  });
}

/**
 * zustand persist용 저장소.
 * localStorage에 쓰면서 같은 내용을 IndexedDB 스냅샷으로도 남기고,
 * 쓰기가 실패하면 조용히 넘기지 않고 알린다.
 */
export const libraryStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    // 백업을 먼저 예약한다. localStorage가 꽉 차서 실패해도 백업은 남는다.
    scheduleSnapshot(value);
    try {
      localStorage.setItem(name, value);
      lastStorageError = null;
    } catch (e) {
      const err = e as { name?: string; message?: string };
      lastStorageError = {
        name: err?.name ?? "Error",
        message: err?.message ?? String(e),
        bytes: value.length * 2,
      };
      flushSnapshot(); // 이런 상황에서는 백업을 미루지 않는다
      window.dispatchEvent(
        new CustomEvent<StorageErrorDetail>(STORAGE_ERROR_EVENT, { detail: lastStorageError })
      );
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* noop */
    }
  },
}));
