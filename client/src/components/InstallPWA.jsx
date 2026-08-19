import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export default function InstallPWA() {
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  if (installed || !evt) return null;
  return <button className="btn btn-ghost" onClick={() => { evt.prompt(); setEvt(null); }}><Download size={14} /> Install App</button>;
}