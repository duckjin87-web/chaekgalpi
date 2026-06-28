# 외부 API 연동 가이드

## 1. Gemini API — 책 맞춤 독서 질문 생성

책을 추가할 때 Gemini가 **그 책의 실제 내용**에 맞는 질문 2개 + 핵심 주제 1개를 생성합니다.
키는 **서버(서버리스 함수)에만 저장**되어 브라우저로 노출되지 않습니다.

동작 구조:
- 프론트엔드 → `/api/reading-prompts` (Vercel 서버리스 함수) → Gemini API
- 키가 없거나 호출 실패 시 → 앱 내장 '기본' 질문 생성기로 자동 폴백 (앱은 항상 동작)

### 설정 방법 (Vercel)

1. Google AI Studio에서 API 키 발급: https://aistudio.google.com/app/apikey
2. Vercel 프로젝트 → **Settings → Environment Variables** 이동
3. 다음 변수 추가:
   - Name: `GEMINI_API_KEY`
   - Value: 발급받은 키
   - Environment: Production / Preview / Development 모두 체크
4. **Save** 후 재배포 (Deployments → 최신 빌드 → Redeploy)

> 로컬에서 테스트하려면 `vercel dev` 로 실행해야 `/api` 함수가 동작합니다.
> 일반 `npm run dev` 에서는 `/api` 호출이 실패하므로 '기본' 질문으로 폴백됩니다(정상 동작).

### 모델 변경
`api/reading-prompts.ts` 상단의 `const MODEL = "gemini-2.0-flash";` 값을 바꾸면 됩니다.
(예: `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`)

---

## 2. 책 정보 자동 입력 — 알라딘(주) + 구글북스(폴백)

도서 검색은 서버리스 함수 `/api/book-search` 가 처리합니다.
- **알라딘 우선**: `ALADIN_TTB_KEY` 가 있으면 알라딘으로 검색(국내 도서·**목차** 강점)
- **구글북스 폴백**: 알라딘 실패/무키 시 자동으로 Google Books 사용
- 둘 다 **Vercel 서버에서 호출**하므로 모바일 공유 IP 쿼터(429) 문제도 회피

가져오는 정보: 제목·저자·표지·페이지수·출판사·출판일·ISBN·책 소개·분류(태그)·**목차(Toc)**

### 알라딘 TTB 키 설정 (목차·국내 도서 정보 활성화)

1. **알라딘 TTB 키 발급 (무료)**
   - https://www.aladin.co.kr/ttb/wblog_manage.aspx 접속 → 로그인
   - "상품 정보 검색 API" 신청 → `TTBKey` 발급

2. **Vercel 환경변수 추가**
   - 프로젝트 → Settings → Environments → Production
   - Name: `ALADIN_TTB_KEY` / Value: 발급받은 TTB 키
   - (Preview/Development 에도 추가 권장)

3. **재배포** (Deployments → 최신 → Redeploy)

> 키가 없어도 검색은 구글북스로 동작합니다. 키를 넣으면 그때부터 알라딘(목차 포함)이 우선 적용됩니다.

### (선택) 구글북스 키
폴백 안정화를 위해 `GOOGLE_BOOKS_API_KEY` 를 추가하면 구글북스도 키 단위 쿼터를 씁니다.
