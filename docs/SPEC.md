# 독서 마인드맵 + 독후감 서비스 스펙

종이책의 감성을 살려, 책을 읽으며 마인드맵으로 정리하고 다 읽으면 독후감을 남기는 개인 독서 서재.

## 구현 범위 (이번 단계)

- **MVP 1단계**: 서재(책 추가/목록/검색/필터) + 책별 마인드맵 에디터(노드 추가·드래그·연결·색상)
- **2단계**: 노드별 메모·이미지 첨부 + 독후감 에디터(별점·인용구·마크다운)

Apps Script/Sheets 연동(3단계), 공유 링크·PWA·내보내기(4단계), 다크모드·통계(5단계)는 아직 구현하지 않았다. 데이터는 브라우저 `localStorage`에 저장된다(zustand persist).

## 데이터 모델

```ts
Book { id, title, author, coverUrl?, status, rating?, startDate?, finishDate?, tags[], createdAt }
MindMap { id, bookId, title, nodes[], edges[], updatedAt }
MindMapNode { id, position{x,y}, data: { text, color, memo, attachments[] } }
Review { id, bookId, content(markdown), rating, quotes[], updatedAt }
```

## 화면 구성

- `LibraryPage` (`/`): 책 카드 그리드, 검색/상태 필터, 책 추가 모달.
- `BookDetailPage` (`/book/:bookId`): 마인드맵/독후감 탭.
  - `MindMapEditor`: `@xyflow/react` 캔버스. 버튼 또는 더블클릭으로 노드 추가, 드래그 이동, 핸들로 연결, 노드 클릭 시 우측 패널에서 텍스트·색상·메모·이미지 편집.
  - `ReviewEditor`: 별점, 마크다운 독후감(편집/미리보기 토글), 인용구 목록.

## 상태 관리

`useLibraryStore` (zustand + persist)가 books/mindMaps/reviews를 관리하고 `localStorage`에 자동 저장한다.
