import { Route, Routes } from "react-router-dom";
import LibraryPage from "./pages/LibraryPage";
import BookDetailPage from "./pages/BookDetailPage";
import RecoverPage from "./pages/RecoverPage";
import ErrorBoundary from "./components/ErrorBoundary";
import DataGuard from "./components/DataGuard";
import BottomTabBar from "./components/common/BottomTabBar";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/book/:bookId" element={<BookDetailPage />} />
        <Route path="/recover" element={<RecoverPage />} />
      </Routes>
      <BottomTabBar />
      <DataGuard />
    </ErrorBoundary>
  );
}
