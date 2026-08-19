import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import Logo from '../components/Logo';
import { Users, Code2, Sparkles } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { hydrate } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      await hydrate();
      
      // ✅ Checks if they came from a share link and sends them back to it
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      navigate(redirect || '/dashboard', { replace: true });
      
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <Logo size={40} textSize={22} />
        <h1>Work together, <span className="grad">in real time.</span></h1>
        <p>A collaborative workspace with a dual code & document editor, live cursors, AI assistance and version-safe autosave.</p>
        <div className="feature-row"><span className="feature-dot"><Users size={16} /></span> Live multiplayer editing with presence</div>
        <div className="feature-row"><span className="feature-dot"><Code2 size={16} /></span> Code + MS-Word docs + PowerPoint slides + Excel sheets</div>
        <div className="feature-row"><span className="feature-dot"><Sparkles size={16} /></span> Irus AI built into your editor</div>
      </div>
      <div className="auth-side">
        <form className="glass auth-card" onSubmit={submit}>
          <h2>Welcome back</h2>
          <div className="sub">Sign in to continue to your workspace.</div>
          {error && <div className="auth-error">{error}</div>}
          <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="btn btn-primary" type="submit">Sign In</button>
          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
            No account? <Link to="/register" style={{ color: 'var(--accent)' }}>Create one</Link>
          </div>
          <div style={{ textAlign: 'center', fontSize: 13 }}>
            <Link to="/" style={{ color: 'var(--muted)' }}>← Back to Home</Link>
          </div>
        </form>
      </div>
    </div>
  );
}