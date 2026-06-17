export type BookStatus = "읽고싶음" | "읽는중" | "완독";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  pageCount?: number;
  status: BookStatus;
  rating?: number;
  startDate?: string;
  finishDate?: string;
  tags: string[];
  createdAt: string;
}

export interface NodeAttachment {
  id: string;
  url: string;
  name: string;
}

export interface MindMapNodeData extends Record<string, unknown> {
  text: string;
  color: string;
  memo: string;
  attachments: NodeAttachment[];
}

export interface MindMapNode {
  id: string;
  position: { x: number; y: number };
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
