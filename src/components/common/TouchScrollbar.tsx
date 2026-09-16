import { useCallback, useEffect, useRef, useState } from "react";

interface TouchScrollbarProps {
  /** 스크롤 대상 컨테이너 */
  targetRef: React.RefObject<HTMLElement | null>;
  /** 아무 동작 없을 때 숨겨질 때까지의 시간(ms) */
  hideDelay?: number;
}

/**
 * 손가락으로 잡아 끌 수 있는 커스텀 스크롤바.
 *
 * 모바일 브라우저는 ::-webkit-scrollbar 를 무시하고 자체 오버레이 스크롤바를
 * 그리기 때문에 CSS 로는 두께를 키울 수 없다. 그래서 오른쪽 가장자리에
 * 넓은 터치 영역(44px)을 두고 그 안에 막대를 직접 그린다.
 * 평소엔 얇고 반투명, 스크롤 중/드래그 중에는 두껍고 진하게 나타난다.
 */
export default function TouchScrollbar({ targetRef, hideDelay = 1400 }: TouchScrollbarProps) {
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [metrics, setMetrics] = useState({ thumbTop: 0, thumbH: 0, trackH: 0 });

  const hideTimer = useRef<number | null>(null);
  const dragState = useRef<{ startY: number; startScroll: number } | null>(null);

  const MIN_THUMB = 48;

  const recompute = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    const trackH = el.clientHeight;
    const ratio = el.clientHeight / el.scrollHeight;
    // 스크롤할 내용이 거의 없으면 표시하지 않는다
    if (ratio >= 0.98) {
      setMetrics({ thumbTop: 0, thumbH: 0, trackH });
      return;
    }
    const thumbH = Math.max(MIN_THUMB, trackH * ratio);
    const maxScroll = el.scrollHeight - el.clientHeight;
    const p = maxScroll > 0 ? el.scrollTop / maxScroll : 0;
    setMetrics({ thumbTop: p * (trackH - thumbH), thumbH, trackH });
  }, [targetRef]);

  const flash = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), hideDelay);
  }, [hideDelay]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const onScroll = () => {
      recompute();
      flash();
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    // 내용 길이 변화도 감지
    if (el.firstElementChild) ro.observe(el.firstElementChild);

    recompute();
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [targetRef, recompute, flash]);

  // 드래그로 스크롤
  useEffect(() => {
    if (!dragging) return;
    const el = targetRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const st = dragState.current;
      if (!st) return;
      e.preventDefault();
      const { trackH, thumbH } = metrics;
      const usable = trackH - thumbH;
      if (usable <= 0) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const delta = e.clientY - st.startY;
      el.scrollTop = Math.max(0, Math.min(maxScroll, st.startScroll + (delta / usable) * maxScroll));
    };
    const onUp = () => {
      setDragging(false);
      dragState.current = null;
      flash();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, metrics, targetRef, flash]);

  if (metrics.thumbH <= 0) return null;

  const active = dragging || visible;

  return (
    <div
      className="pointer-events-none fixed right-0 top-0 z-40 h-full"
      style={{ width: 44 }}
      aria-hidden
    >
      {/* 트랙 (드래그 중에만 살짝 보이게) */}
      <div
        className="absolute right-[6px] top-0 h-full rounded-full transition-opacity duration-200"
        style={{
          width: 10,
          background: "rgba(34,51,90,0.08)",
          opacity: dragging ? 1 : 0,
        }}
      />
      {/* 썸: 넓은 터치 영역 + 안쪽 막대 */}
      <div
        className="pointer-events-auto absolute right-0 flex items-stretch justify-end"
        style={{
          width: 44,
          height: metrics.thumbH,
          transform: `translateY(${metrics.thumbTop}px)`,
          touchAction: "none",
          cursor: "grab",
        }}
        onPointerDown={(e) => {
          const el = targetRef.current;
          if (!el) return;
          e.preventDefault();
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          dragState.current = { startY: e.clientY, startScroll: el.scrollTop };
          setDragging(true);
          setVisible(true);
          if (hideTimer.current) window.clearTimeout(hideTimer.current);
        }}
      >
        <div
          className="my-1 rounded-full transition-all duration-200"
          style={{
            width: dragging ? 12 : active ? 8 : 4,
            marginRight: dragging ? 4 : 6,
            background: dragging
              ? "rgba(34,51,90,0.92)"
              : active
                ? "rgba(34,51,90,0.55)"
                : "rgba(34,51,90,0.22)",
            boxShadow: dragging ? "0 0 0 3px rgba(34,51,90,0.15)" : "none",
          }}
        />
      </div>
    </div>
  );
}
