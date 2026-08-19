import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import { FileText, Home, Loader2 } from 'lucide-react';

export default function PublicShare() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Force login if not authenticated
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/s/${token}`)}`, { replace: true });
      return;
    }

    // 2. Resolve the share token via backend using the proper API instance
    const fetchDoc = async () => {
      try {
        // ✅ This uses the correct base URL and automatically attaches the JWT token
        const res = await API.get(`/documents/share/resolve/${token}`);
        navigate(`/documents/${res.data.id}`, { replace: true });
      } catch (err) {
        console.error('Share resolve error:', err);
        setError(err.response?.data?.error || 'This share link is invalid, expired, or the document is private.');
        setLoading(false);
      }
    };
    
    if (token) fetchDoc();
  }, [token, navigate, user]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--primary)' }} />
        <div style={{ fontWeight: 600, color: 'var(--muted)' }}>Verifying shared link...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center', padding: 20 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--glass)', display: 'grid', placeItems: 'center' }}>
        <FileText size={32} style={{ color: 'var(--muted)' }} />
      </div>
      <h2 style={{ margin: 0 }}>Access Denied</h2>
      <p style={{ color: 'var(--muted)', maxWidth: 420, lineHeight: 1.6 }}>{error}</p>
      <button className="btn btn-primary" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Home size={16} /> Go to Homepage
      </button>
    </div>
  );
}