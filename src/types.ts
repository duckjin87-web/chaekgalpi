export type BookStatus = "읽고싶음" | "읽는중" | "완독";

export interface ReadingPrompts {
  /** 책의 서평·비평에서 자주 논의되는 쟁점 기반 질문 3가지 */
  questions: string[];
  /** (구버전 호환) 깊이 생각해볼 핵심 주제 */
  coreTheme?: string;
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
  /** 생각거리 질문별 간략 답변(질문과 같은 순서) */
  promptAnswers?: string[];
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
  /** 새로 만든 노드는 바로 편집(타이핑) 상태로 시작 */
  autoEdit?: boolean;
  /** 인상 깊은 문장에 곁들일 사진 (data URL) */
  photoUrl?: string;
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

export type QuoteColor = "yellow" | "blue" | "pink" | "green" | "cream";

export interface Quote {
  id: string;
  bookId: string;
  text: string;
  page?: string;
  color: QuoteColor;
  photoUrl?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  bookId: string;
  content: string;
  rating: number;
  photoUrl?: string;
  updatedAt: string;
}
