import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>← Home</button>
      <Logo size={34} />
      <h1>Privacy Policy</h1>
      <p style={{ color: 'var(--muted)' }}>Last updated: August 2026</p>
      <h3>1. Data we collect</h3><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Account details (username, email, hashed password), documents you create, and usage metrics needed to run the service. We never sell your data.</p>
      <h3>2. Where it lives</h3><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Documents are stored encrypted-in-transit and persisted in Neon PostgreSQL. Realtime edits sync over WebSockets using CRDTs.</p>
      <h3>3. Cookies</h3><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>We use a single session token and preference cookies (theme, language). No advertising trackers.</p>
      <h3>4. Your rights</h3><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>You may export or delete your data at any time from your Profile, or email nejamulhaque.works@gmail.com for GDPR requests.</p>
    </div>
  );
}