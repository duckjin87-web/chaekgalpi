import { createJSONStorage } from "zustand/middleware";

/** localStorage 쓰기가 실패했을 때 발생하는 이벤트 이름 */
export const STORAGE_ERROR_EVENT = "chaekgalpi:storage-error";

export interface StorageErrorDetail {
  name: string;
  message: string;
  bytes: number;
}

/**
 * zustand persist용 저장소.
 * localStorage 쓰기가 실패하면(용량 초과 등) 조용히 넘기지 않고 알린다.
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
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      const err = e as { name?: string; message?: string };
      window.dispatchEvent(
        new CustomEvent<StorageErrorDetail>(STORAGE_ERROR_EVENT, {
          detail: {
            name: err?.name ?? "Error",
            message: err?.message ?? String(e),
            bytes: value.length * 2,
          },
        })
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
