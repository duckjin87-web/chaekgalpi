# chaekgalpi (책갈피)

책을 읽으며 마인드맵으로 정리하고, 다 읽으면 독후감을 남기는 개인 독서 서재. 자세한 기능 명세는 [docs/SPEC.md](docs/SPEC.md) 참고.

## 폴더 구조

```
├── README.md
├── index.html
├── package.json
├── tailwind.config.js  (등 설정 파일들)
├── docs/
│   └── SPEC.md
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── types.ts · theme.ts · index.css
    ├── store/
    │   └── useLibraryStore.ts
    ├── data/
    │   └── seed.ts
    ├── pages/
    │   ├── LibraryPage.tsx
    │   └── BookDetailPage.tsx
    └── components/
        ├── library/
        │   ├── BookCard.tsx · AddBookModal.tsx · LibraryToolbar.tsx
        ├── mindmap/
        │   ├── MindMapEditor.tsx · BookmarkNode.tsx · NodeSidePanel.tsx
        └── review/
            ├── ReviewEditor.tsx · RatingStars.tsx · QuoteList.tsx
```

## 개발

```bash
npm install
npm run dev
npm run build
```
