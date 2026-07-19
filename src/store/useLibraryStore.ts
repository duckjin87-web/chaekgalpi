import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Book, MindMap, MindMapEdge, MindMapNode, Review } from "../types";
import { seedBooks, seedMindMaps, seedReviews } from "../data/seed";
import {
  bookmarkColors,
  memoColors,
  shuffleBookmarkPalette,
  shuffleMemoPalette,
} from "../theme";

interface LibraryState {
  books: Book[];
  mindMaps: MindMap[];
  reviews: Review[];
  bookmarkPalette: string[];
  memoPalette: string[];

  addBook: (book: Omit<Book, "id" | "createdAt">) => Book;
  updateBook: (id: string, patch: Partial<Book>) => void;
  removeBook: (id: string) => void;

  getMindMap: (bookId: string) => MindMap | undefined;
  updateMindMap: (
    bookId: string,
    patch: { nodes?: MindMapNode[]; edges?: MindMapEdge[]; layoutPreset?: string }
  ) => void;

  getReview: (bookId: string) => Review | undefined;
  upsertReview: (bookId: string, patch: Partial<Omit<Review, "id" | "bookId">>) => void;

  reshuffleBookmarkPalette: () => void;
  reshuffleMemoPalette: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      books: seedBooks,
      mindMaps: seedMindMaps,
      reviews: seedReviews,
      bookmarkPalette: [...bookmarkColors],
      memoPalette: [...memoColors],

      addBook: (book: Omit<Book, "id" | "createdAt">) => {
        const newBook: Book = {
          ...book,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const titleNode: MindMapNode = {
          id: crypto.randomUUID(),
          type: "bookmark",
          position: { x: 0, y: 0 },
          data: {
            text: newBook.title,
            color: get().bookmarkPalette[0],
            memo: "",
            attachments: [],
            level: "title",
          },
        };
        const newMindMap: MindMap = {
          id: crypto.randomUUID(),
          bookId: newBook.id,
          title: `${newBook.title} 마인드맵`,
          nodes: [titleNode],
          edges: [],
          updatedAt: new Date().toISOString(),
        };
        set((state: LibraryState) => ({
          books: [...state.books, newBook],
          mindMaps: [...state.mindMaps, newMindMap],
        }));
        return newBook;
      },

      updateBook: (id: string, patch: Partial<Book>) =>
        set((state: LibraryState) => ({
          books: state.books.map((b: Book) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      removeBook: (id: string) =>
        set((state: LibraryState) => ({
          books: state.books.filter((b: Book) => b.id !== id),
          mindMaps: state.mindMaps.filter((m: MindMap) => m.bookId !== id),
          reviews: state.reviews.filter((r: Review) => r.bookId !== id),
        })),

      getMindMap: (bookId: string) =>
        get().mindMaps.find((m: MindMap) => m.bookId === bookId),

      updateMindMap: (
        bookId: string,
        patch: { nodes?: MindMapNode[]; edges?: MindMapEdge[]; layoutPreset?: string }
      ) =>
        set((state: LibraryState) => ({
          mindMaps: state.mindMaps.map((m: MindMap) =>
            m.bookId === bookId
              ? { ...m, ...patch, updatedAt: new Date().toISOString() }
              : m
          ),
        })),

      getReview: (bookId: string) =>
        get().reviews.find((r: Review) => r.bookId === bookId),

      upsertReview: (bookId: string, patch: Partial<Omit<Review, "id" | "bookId">>) =>
        set((state: LibraryState) => {
          const existing = state.reviews.find((r: Review) => r.bookId === bookId);
          if (existing) {
            return {
              reviews: state.reviews.map((r: Review) =>
                r.bookId === bookId
                  ? { ...r, ...patch, updatedAt: new Date().toISOString() }
                  : r
              ),
            };
          }
          const newReview: Review = {
            id: crypto.randomUUID(),
            bookId,
            content: "",
            rating: 0,
            quotes: [],
            updatedAt: new Date().toISOString(),
            ...patch,
          };
          return { reviews: [...state.reviews, newReview] };
        }),

      reshuffleBookmarkPalette: () => set({ bookmarkPalette: shuffleBookmarkPalette() }),
      reshuffleMemoPalette: () => set({ memoPalette: shuffleMemoPalette() }),
    }),
    { name: "chaekgalpi-library" }
  )
);
