import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import Logo from '../components/Logo';
import {
  Users, Code2, Sparkles, Eye, EyeOff, ShieldCheck,
  CheckCircle2, ArrowRight, FileSpreadsheet, Presentation, FileText,
} from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { hydrate } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', { username, email, password });
      localStorage.setItem('token', data.token);
      await hydrate();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Email may already be registered.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-shell">
      {/* Brand Showcase Side */}
      <div className="auth-brand">
        <Logo size={42} textSize={24} />
        <h1>
          Start Collaborating <span className="grad">Without Limits.</span>
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--muted)' }}>
          Create a free account and immediately access full-featured VS Code workspaces, Word documents, Excel sheets, PowerPoint decks, and interactive whiteboard boards.
        </p>

        <div className="feature-row">
          <span className="feature-dot" style={{ color: 'var(--success)' }}><CheckCircle2 size={18} /></span>
          <div>
            <b>Instant Realtime Sync</b>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Multiplayer live cursor collaboration powered by Yjs WebSockets.</div>
          </div>
        </div>

        <div className="feature-row">
          <span className="feature-dot" style={{ color: 'var(--accent)' }}><Sparkles size={18} /></span>
          <div>
            <b>Irus AI Integration</b>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Context-aware coding, copywriting, and formula generation.</div>
          </div>
        </div>

        <div className="feature-row">
          <span className="feature-dot" style={{ color: '#007acc' }}><Code2 size={18} /></span>
          <div>
            <b>Cloud Code Runner</b>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Execute Python, JavaScript, Bash and more with terminal console.</div>
          </div>
        </div>
      </div>

      {/* Auth Form Card */}
      <div className="auth-side">
        <form className="glass auth-card" onSubmit={submit}>
          <h2>Create your workspace 🚀</h2>
          <div className="sub">Free forever • No credit card required.</div>

          {error && <div className="auth-error">{error}</div>}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>
              Full name or Username
            </label>
            <input
              className="input"
              placeholder="e.g. Alex Rivera"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>
              Email address
            </label>
            <input
              className="input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>
              Create Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                className="vscode-icon-btn"
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: '12px', fontSize: 14 }}>
            {loading ? 'Creating Account…' : 'Sign Up Free'} <ArrowRight size={16} />
          </button>

          <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Sign in
            </Link>
          </div>

          <div style={{ textAlign: 'center', fontSize: 12.5 }}>
            <Link to="/" style={{ color: 'var(--muted)' }}>
              ← Back to Collab-Sheets Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}