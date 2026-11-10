import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "../../lib/useTransitionNavigate";
import ThemeSheet from "./ThemeSheet";

const icons = {
  library: <path d="M4 5h4v15H4zM10 5h4v15h-4zM16.5 6.5l3.5-1 3 13.5-3.5 1z" />,
  add: <path d="M12 5v14M5 12h14" />,
  theme: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.8-1.8 0-1.4-1-1.7-1-2.7 0-.8.7-1.5 1.6-1.5H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10.5" cy="7.2" r="1" />
      <circle cx="15" cy="7.5" r="1" />
    </>
  ),
  backup: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M6 6l3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5" />
    </>
  ),
};

/**
 * 하단 탭 바 (서재 · 책 추가 · 테마 · 백업).
 * 움직임은 테마마다 다르다 — 종이: 슬라이딩 필 / 글래스: 익스팬딩 라벨 / 브루탈: 아이콘 필.
 * (스타일은 src/themes.css 의 .tabbar)
 */
export default function BottomTabBar() {
  const { pathname } = useLocation();
  const navigate = useTransitionNavigate();
  const [showTheme, setShowTheme] = useState(false);

  // 서재와 백업 화면에서만 보인다 (책 상세는 마인드맵 공간을 위해 숨김)
  if (pathname !== "/" && pathname !== "/recover") return null;

  const active = showTheme ? 2 : pathname === "/recover" ? 3 : 0;
  const tabs = [
    { label: "서재", icon: icons.library, onClick: () => pathname !== "/" && navigate("/", { back: true }) },
    {
      label: "책 추가",
      icon: icons.add,
      onClick: () => navigate("/", { state: { add: Date.now() }, back: pathname !== "/" }),
    },
    { label: "테마", icon: icons.theme, onClick: () => setShowTheme(true) },
    { label: "백업", icon: icons.backup, onClick: () => pathname !== "/recover" && navigate("/recover") },
  ];

  return (
    <>
      <nav
        className="tabbar"
        style={{ ["--i" as string]: active, ["--n" as string]: tabs.length }}
        aria-label="주요 메뉴"
      >
        {tabs.map((t, i) => (
          <button
            key={t.label}
            className={`tab ${i === active ? "on" : ""}`}
            onClick={t.onClick}
            aria-current={i === active ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {t.icon}
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {showTheme && <ThemeSheet onClose={() => setShowTheme(false)} />}
    </>
  );
}
