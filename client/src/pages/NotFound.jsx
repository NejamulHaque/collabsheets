import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, textAlign: 'center' }}>
      <Logo size={48} withText={false} />
      <h1 className="grad" style={{ fontSize: 72, margin: 0 }}>404</h1>
      <p style={{ color: 'var(--muted)', maxWidth: 420 }}>This sheet drifted off the grid. The page you're looking for doesn't exist or was moved.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={() => navigate('/')}>← Back to Home</button>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Open Dashboard</button>
      </div>
    </div>
  );
}