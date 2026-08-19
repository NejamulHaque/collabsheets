import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import PresentPage from './pages/PresentPage';
import PublicShare from './pages/PublicShare';
import NotFound from './pages/NotFound';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

function Protected({ children }) {
  const { user } = useAuthStore();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.resolve(useAuthStore.getState().hydrate()).finally(() => setReady(true));
    const t = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(t);
  }, []);
  if (!ready) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontWeight: 700 }}>⌘ Loading CollabSheets…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/present/:id" element={<PresentPage />} />
        <Route path="/s/:token" element={<PublicShare />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/documents/:id" element={<Protected><Editor /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/admin" element={<Protected><Admin /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}