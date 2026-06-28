export type BookStatus = "읽고싶음" | "읽는중" | "완독";

export interface ReadingPrompts {
  /** 읽기 전/중 생각해볼 간단한 질문 2가지 */
  questions: string[];
  /** 깊이 생각해볼 핵심 주제 1가지 */
  coreTheme: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  pageCount?: number;
  currentPage?: number;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  bookType?: string;
  toc?: string[];
  status: BookStatus;
  rating?: number;
  startDate?: string;
  finishDate?: string;
  tags: string[];
  createdAt: string;
  /** 책 추가 시 제안되는 몰입형 독서 생각거리 */
  readingPrompts?: ReadingPrompts;
}

export interface NodeAttachment {
  id: string;
  url: string;
  name: string;
}

export type NodeLevel = "title" | "major" | "medium" | "minor";

export type MindNodeKind = "bookmark" | "memo";

export interface MindMapNodeData extends Record<string, unknown> {
  text: string;
  color: string;
  memo: string;
  attachments: NodeAttachment[];
  /** 대/중/소 주제 구분 (bookmark 노드) */
  level?: NodeLevel;
  /** 포스트잇 메모 폰트 크기(px) */
  fontSize?: number;
  /** 포스트잇 메모 투명도 (0~1) */
  opacity?: number;
}

export interface MindMapNode {
  id: string;
  type?: MindNodeKind;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  data: MindMapNodeData;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
}

export interface MindMap {
  id: string;
  bookId: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  updatedAt: string;
  /** 마인드맵 배치/노드 모양 프리셋 id */
  layoutPreset?: string;
}

export interface Quote {
  id: string;
  text: string;
  page?: string;
}

export interface Review {
  id: string;
  bookId: string;
  content: string;
  rating: number;
  quotes: Quote[];
  updatedAt: string;
}
