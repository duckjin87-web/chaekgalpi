import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./themes.css";
import { initTheme } from "./lib/appTheme";

// 저장된 테마를 첫 화면이 그려지기 전에 적용 (깜빡임 방지)
initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// PWA: 서비스워커 등록(홈 화면 설치 + 오프라인 지원)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
