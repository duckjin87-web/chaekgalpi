import { Route, Routes } from "react-router-dom";
import LibraryPage from "./pages/LibraryPage";
import BookDetailPage from "./pages/BookDetailPage";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/book/:bookId" element={<BookDetailPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
