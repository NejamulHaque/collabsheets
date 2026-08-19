import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import Logo from '../components/Logo';
import { Users, Code2, Sparkles } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { hydrate } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await API.post('/auth/register', { username, email, password });
      localStorage.setItem('token', data.token);
      await hydrate();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <Logo size={40} textSize={22} />
        <h1>Start collaborating, <span className="grad">for free.</span></h1>
        <p>Create your workspace in seconds — code, docs, slides and sheets with realtime multiplayer and AI built in.</p>
        <div className="feature-row"><span className="feature-dot"><Users size={16} /></span> Invite teammates with share links & roles</div>
        <div className="feature-row"><span className="feature-dot"><Code2 size={16} /></span> Run 60+ languages instantly</div>
        <div className="feature-row"><span className="feature-dot"><Sparkles size={16} /></span> Free plan with 5 AI requests/day</div>
      </div>
      <div className="auth-side">
        <form className="glass auth-card" onSubmit={submit}>
          <h2>Create account</h2>
          <div className="sub">Join CollabSheets — it takes 10 seconds.</div>
          {error && <div className="auth-error">{error}</div>}
          <input className="input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
          <button className="btn btn-primary" type="submit">Sign Up Free</button>
          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
          </div>
          <div style={{ textAlign: 'center', fontSize: 13 }}>
            <Link to="/" style={{ color: 'var(--muted)' }}>← Back to Home</Link>
          </div>
        </form>
      </div>
    </div>
  );
}