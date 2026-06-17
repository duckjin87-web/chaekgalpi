import type { Book, MindMap, Review } from "../types";

export const seedBooks: Book[] = [
  {
    id: "b1",
    title: "사피엔스",
    author: "유발 하라리",
    status: "읽는중",
    tags: ["인문", "역사"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "b2",
    title: "어린 왕자",
    author: "생텍쥐페리",
    status: "완독",
    rating: 5,
    tags: ["소설"],
    createdAt: new Date().toISOString(),
  },
];

export const seedMindMaps: MindMap[] = [
  {
    id: "m1",
    bookId: "b1",
    title: "사피엔스 마인드맵",
    nodes: [
      {
        id: "n1",
        position: { x: 0, y: 0 },
        data: { text: "인지 혁명", color: "#2F5D50", memo: "", attachments: [] },
      },
      {
        id: "n2",
        position: { x: 250, y: 120 },
        data: { text: "농업 혁명", color: "#1F3A5F", memo: "", attachments: [] },
      },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
    updatedAt: new Date().toISOString(),
  },
];

export const seedReviews: Review[] = [
  {
    id: "r1",
    bookId: "b2",
    content: "짧지만 깊은 울림을 주는 이야기.",
    rating: 5,
    quotes: [{ id: "q1", text: "중요한 것은 눈에 보이지 않아." }],
    updatedAt: new Date().toISOString(),
  },
];
