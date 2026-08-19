import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register'; // You can duplicate Login.jsx and change to register()
import Dashboard from './pages/Dashboard';
import { useAuthStore } from './store/authStore';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { useEffect } from 'react';
import axios from 'axios';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  const { user } = useAuthStore();

  useEffect(() => {
    // Auto-login on refresh if token exists
    const token = localStorage.getItem('token');
    if (token && !user) {
      axios.get('http://localhost:5001/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        // Note: You should add a GET /me route to your backend later to fetch user data on refresh
        .catch(() => localStorage.removeItem('token')); 
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}