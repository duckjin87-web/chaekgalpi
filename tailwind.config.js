import typography from "@tailwindcss/typography";

// 강조색(emerald) · 보조색(amber)을 CSS 변수에 연결한다.
// 테마 메뉴에서 색상 배열을 바꾸면 이 변수만 바뀌고, 화면 코드는 그대로 따라온다.
// 기본값(원래 emerald/amber)은 src/index.css 의 :root 에 있다.
const scale = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((level) => [
      level,
      `rgb(var(--${name}-${level}) / <alpha-value>)`,
    ])
  );

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        emerald: scale("accent"),
        amber: scale("second"),
      },
    },
  },
  plugins: [typography],
};
