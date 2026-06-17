import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import MeetingEdit from '@/pages/MeetingEdit';
import Board from '@/pages/Board';
import SearchPage from '@/pages/Search';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/meetings" replace />} />
          <Route path="/meetings" element={<div className="animate-fade-in-up">会议列表页 - 待开发</div>} />
          <Route path="/meetings/new" element={<MeetingEdit />} />
          <Route path="/meetings/:id" element={<div className="animate-fade-in-up">会议详情页 - 待开发</div>} />
          <Route path="/meetings/:id/edit" element={<MeetingEdit />} />
          <Route path="/board" element={<Board />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/meetings" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
