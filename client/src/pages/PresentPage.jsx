import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { THEMES, bgStyle } from '../components/SlidesEditor';

export default function PresentPage() {
  const { id } = useParams();
  const [slides, setSlides] = useState(null);
  const [idx, setIdx] = useState(0);
  const [, bump] = useState(0);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:5001/yjs', id, ydoc);
    const arr = ydoc.getArray('slides');
    const obs = () => bump(x => x + 1);
    arr.observe(obs);
    setSlides(arr);
    const bc = new BroadcastChannel('cs-present-' + id);
    bc.onmessage = (e) => { if (e.data?.type === 'idx') setIdx(e.data.idx); };
    return () => { arr.unobserve(obs); provider.destroy(); ydoc.destroy(); bc.close(); };
  }, [id]);

  if (!slides || slides.length === 0) return <div style={{ color: '#fff', padding: 40, fontFamily: 'sans-serif' }}>Waiting for slides…</div>;
  const slide = slides.get(Math.min(idx, slides.length - 1));
  if (!slide) return null;

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <div key={idx} className={`present-slide ${slide.get('transition') || 'fade'}`} style={{ ...bgStyle(slide), width: '92vw', height: '86vh', animationDuration: slide.get('tspeed') || '0.5s' }}>
        <div className={`present-title anim-${slide.get('animation') || 'fade'}`}>{slide.get('title')}</div>
        <div className={`present-body anim-${slide.get('animation') || 'fade'}`}>{slide.get('body')}</div>
      </div>
    </div>
  );
}