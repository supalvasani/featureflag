import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SetupPage from './pages/SetupPage';
import FlagsPage from './pages/FlagsPage';
import FlagDetailPage from './pages/FlagDetailPage';
import EvaluatePage from './pages/EvaluatePage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const key = localStorage.getItem('ff_api_key');
  if (!key) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/flags" replace />} />
          <Route path="flags" element={<FlagsPage />} />
          <Route path="flags/:key" element={<FlagDetailPage />} />
          <Route path="evaluate" element={<EvaluatePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
