import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>← Home</button>
      <Logo size={34} />
      <h1>Terms of Service</h1>
      <p style={{ color: 'var(--muted)' }}>Last updated: August 2026</p>
      <h3>1. Acceptable use</h3><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Use CollabSheets lawfully. No malware, abuse, or attempts to disrupt the execution sandbox.</p>
      <h3>2. Free & Pro plans</h3><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Free accounts include 3 documents and 5 AI requests/day. Pro (₹749/month) unlocks unlimited usage after admin verification of payment.</p>
      <h3>3. Content ownership</h3><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>You own everything you create. We only store it so you and your collaborators can access it.</p>
      <h3>4. Liability</h3><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>The service is provided "as is". We are not liable for data loss beyond our backup mechanisms.</p>
    </div>
  );
}