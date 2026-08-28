import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import Logo from '../components/Logo';
import {
  Code2, Eye, EyeOff, ShieldCheck,
  FileSpreadsheet, Presentation, FileText, ArrowRight,
  Sparkles, Lock, Mail,
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { hydrate } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      await hydrate();

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      navigate(redirect || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password. Please verify your credentials or create a new account.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-shell">
      {/* Brand Showcase Side */}
      <div className="auth-brand">
        <Logo size={42} textSize={24} />
        <h1>
          The Ultimate Suite for <span className="grad">Code & Office Collaboration.</span>
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--muted)' }}>
          Experience the power of Visual Studio Code, Microsoft Word, Excel, PowerPoint, and Whiteboard in one unified multiplayer workspace with live real-time sync and Irus AI.
        </p>

        <div className="feature-row">
          <span className="feature-dot" style={{ color: '#007acc' }}><Code2 size={18} /></span>
          <div>
            <b>Visual Studio Code IDE</b>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Explorer, Git history, Debugger, and interactive Terminal.</div>
          </div>
        </div>

        <div className="feature-row">
          <span className="feature-dot" style={{ color: '#185abd' }}><FileText size={18} /></span>
          <div>
            <b>Microsoft Word 365</b>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Word ribbons, typography styles, tables, and speech read aloud.</div>
          </div>
        </div>

        <div className="feature-row">
          <span className="feature-dot" style={{ color: '#107c41' }}><FileSpreadsheet size={18} /></span>
          <div>
            <b>Microsoft Excel 365</b>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>30+ formulas, multi-sheet tabs, aggregations, and floating charts.</div>
          </div>
        </div>

        <div className="feature-row">
          <span className="feature-dot" style={{ color: '#c43e1c' }}><Presentation size={18} /></span>
          <div>
            <b>PowerPoint & Presenter View</b>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>10 themes, slide transitions, red laser pointer, and speaker timer.</div>
          </div>
        </div>
      </div>

      {/* Auth Form Card */}
      <div className="auth-side">
        <form className="glass auth-card" onSubmit={submit}>
          <h2>Welcome back 👋</h2>
          <div className="sub">Sign in to access your documents and workspace.</div>

          {error && <div className="auth-error">{error}</div>}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ paddingLeft: 34 }}
              />
              <Mail size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingLeft: 34, paddingRight: 38 }}
              />
              <Lock size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
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
            {loading ? 'Signing in…' : 'Sign In to Workspace'} <ArrowRight size={16} />
          </button>

          <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Create an account
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