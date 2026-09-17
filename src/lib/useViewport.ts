import { useEffect, useState } from "react";

export interface ViewportInfo {
  width: number;
  height: number;
  /** 가로가 세로보다 긴 상태 */
  landscape: boolean;
  /** 가로모드이면서 세로 공간이 좁은 폰 (예: 800×360) */
  shortLandscape: boolean;
}

function read(): ViewportInfo {
  if (typeof window === "undefined") {
    return { width: 0, height: 0, landscape: false, shortLandscape: false };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const landscape = width > height;
  return { width, height, landscape, shortLandscape: landscape && height < 520 };
}

/**
 * 화면 크기·방향을 추적한다.
 * 가로모드에서는 세로 공간이 크게 줄어들어(폰 기준 ~360px) 고정 높이 UI 가
 * 화면을 넘치므로, 이 값으로 높이를 조절한다.
 */
export function useViewport(): ViewportInfo {
  const [info, setInfo] = useState<ViewportInfo>(read);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      // 회전 직후에는 innerHeight 가 갱신되기 전이라 한 프레임 미룬다
      raf = requestAnimationFrame(() => setInfo(read()));
    };
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return info;
}
