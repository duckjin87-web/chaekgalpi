import { Route, Routes } from "react-router-dom";
import LibraryPage from "./pages/LibraryPage";
import BookDetailPage from "./pages/BookDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LibraryPage />} />
      <Route path="/book/:bookId" element={<BookDetailPage />} />
    </Routes>
  );
}
