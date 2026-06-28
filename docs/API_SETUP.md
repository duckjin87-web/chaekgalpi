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

## 2. 책 정보 자동 입력 (저자 · 페이지수 · 출판사 · ISBN)

현재 **구글북스 API**(키 불필요)로 제목 검색 시 자동 입력됩니다:
- 제목, 저자, 표지, 페이지수, 출판사, 출판일, ISBN, 책 소개, 장르

### 목차(Toc)까지 원한다면 — 알라딘 API (선택)

구글북스는 **목차를 제공하지 않습니다.** 국내 도서 목차가 필요하면 알라딘 API를 추가해야 합니다.

순차 설정 방법:

1. **알라딘 TTB 키 발급 (무료)**
   - https://www.aladin.co.kr/ttb/wblog_manage.aspx 접속 → 로그인
   - "상품 정보 검색 API" 신청 → `TTBKey` 발급

2. **Vercel 환경변수 추가**
   - Name: `ALADIN_TTB_KEY` / Value: 발급받은 TTB 키

3. **서버리스 함수 추가** (요청 주시면 구현해 드립니다)
   - `api/book-info.ts` 생성: ISBN을 받아 알라딘 `ItemLookUp` 호출
   - 엔드포인트 예시:
     ```
     https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx
       ?ttbkey=TTBKEY&itemIdType=ISBN13&ItemId=<ISBN>
       &output=js&Version=20131101&OptResult=Toc
     ```
   - 응답의 `item[0].bookinfo.toc` (HTML)를 파싱해 목차 추출

4. **프론트엔드 연동**
   - 책 선택/검색 시 ISBN으로 `/api/book-info` 호출 → 목차를 모달에 표시·저장

> 알라딘 TTB 키를 발급받으셨다면 알려주세요. 3~4단계(함수 + 프론트 연동)를 바로 구현하겠습니다.
