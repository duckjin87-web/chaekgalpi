import type { BookNode } from "../types";

export const seedShelf: BookNode[] = [
  {
    id: "1",
    title: "어린 왕자",
    author: "생텍쥐페리",
    color: "#3C6E71",
    children: [
      {
        id: "1-1",
        title: "사막의 장미",
        author: "생텍쥐페리",
        color: "#B08968",
        children: [],
      },
    ],
  },
  {
    id: "2",
    title: "데미안",
    author: "헤르만 헤세",
    color: "#A83232",
    children: [],
  },
  {
    id: "3",
    title: "1984",
    author: "조지 오웰",
    color: "#4A4E69",
    children: [],
  },
];
