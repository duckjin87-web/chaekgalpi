import { Route, Routes } from "react-router-dom";
import LibraryPage from "./pages/LibraryPage";
import BookDetailPage from "./pages/BookDetailPage";
import RecoverPage from "./pages/RecoverPage";
import ErrorBoundary from "./components/ErrorBoundary";
import DataGuard from "./components/DataGuard";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/book/:bookId" element={<BookDetailPage />} />
        <Route path="/recover" element={<RecoverPage />} />
      </Routes>
      <DataGuard />
    </ErrorBoundary>
  );
}
