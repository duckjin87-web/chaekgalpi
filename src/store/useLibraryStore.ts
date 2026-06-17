import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Book, MindMap, MindMapEdge, MindMapNode, Review } from "../types";
import { seedBooks, seedMindMaps, seedReviews } from "../data/seed";

interface LibraryState {
  books: Book[];
  mindMaps: MindMap[];
  reviews: Review[];

  addBook: (book: Omit<Book, "id" | "createdAt">) => Book;
  updateBook: (id: string, patch: Partial<Book>) => void;
  removeBook: (id: string) => void;

  getMindMap: (bookId: string) => MindMap | undefined;
  updateMindMap: (bookId: string, patch: { nodes?: MindMapNode[]; edges?: MindMapEdge[] }) => void;

  getReview: (bookId: string) => Review | undefined;
  upsertReview: (bookId: string, patch: Partial<Omit<Review, "id" | "bookId">>) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      books: seedBooks,
      mindMaps: seedMindMaps,
      reviews: seedReviews,

      addBook: (book) => {
        const newBook: Book = {
          ...book,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const newMindMap: MindMap = {
          id: crypto.randomUUID(),
          bookId: newBook.id,
          title: `${newBook.title} 마인드맵`,
          nodes: [],
          edges: [],
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          books: [...state.books, newBook],
          mindMaps: [...state.mindMaps, newMindMap],
        }));
        return newBook;
      },

      updateBook: (id, patch) =>
        set((state) => ({
          books: state.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      removeBook: (id) =>
        set((state) => ({
          books: state.books.filter((b) => b.id !== id),
          mindMaps: state.mindMaps.filter((m) => m.bookId !== id),
          reviews: state.reviews.filter((r) => r.bookId !== id),
        })),

      getMindMap: (bookId) => get().mindMaps.find((m) => m.bookId === bookId),

      updateMindMap: (bookId, patch) =>
        set((state) => ({
          mindMaps: state.mindMaps.map((m) =>
            m.bookId === bookId
              ? { ...m, ...patch, updatedAt: new Date().toISOString() }
              : m
          ),
        })),

      getReview: (bookId) => get().reviews.find((r) => r.bookId === bookId),

      upsertReview: (bookId, patch) =>
        set((state) => {
          const existing = state.reviews.find((r) => r.bookId === bookId);
          if (existing) {
            return {
              reviews: state.reviews.map((r) =>
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
    }),
    { name: "chaekgalpi-library" }
  )
);
