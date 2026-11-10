import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

interface TransitionOptions {
  /** 뒤로 가는 이동인지 (푸시 전환 방향이 반대가 된다) */
  back?: boolean;
  /** 다음 화면으로 이어질 요소 (책 표지) — 카드 확장 전환에 쓰인다 */
  sharedEl?: HTMLElement | null;
  state?: unknown;
}

type StartViewTransition = (cb: () => void) => { finished: Promise<void> };

/**
 * 화면 전환 애니메이션과 함께 이동한다 (View Transitions API).
 * 전환 모양은 테마가 정한다 (src/themes.css) — 종이: 카드 확장 / 글래스: 페이드 스루 / 브루탈: 푸시.
 * 지원하지 않는 브라우저나 '동작 줄이기' 설정에서는 그냥 이동한다.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();
  return (to: string, opts: TransitionOptions = {}) => {
    const go = () => navigate(to, opts.state !== undefined ? { state: opts.state } : undefined);
    const start = (
      document as unknown as { startViewTransition?: StartViewTransition }
    ).startViewTransition?.bind(document);
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!start || reduced) {
      go();
      return;
    }
    const root = document.documentElement;
    root.dataset.nav = opts.back ? "back" : "forward";
    if (opts.sharedEl && root.dataset.theme === "paper") {
      opts.sharedEl.style.setProperty("view-transition-name", "book-cover");
    }
    try {
      const transition = start(() => flushSync(go));
      void transition.finished.catch(() => {}).then(() => delete root.dataset.nav);
    } catch {
      go();
    }
  };
}
