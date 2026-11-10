import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTransitionNavigate } from "../../lib/useTransitionNavigate";

interface TLinkProps {
  to: string;
  back?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}

/**
 * 화면 전환 애니메이션이 붙는 링크.
 * 안에 [data-cover] 요소가 있으면 그 표지가 다음 화면으로 이어진다(카드 확장).
 */
export default function TLink({ to, back, children, ...rest }: TLinkProps) {
  const navigate = useTransitionNavigate();
  return (
    <Link
      to={to}
      {...rest}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to, {
          back,
          sharedEl: e.currentTarget.querySelector<HTMLElement>("[data-cover]"),
        });
      }}
    >
      {children}
    </Link>
  );
}
