import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { THEMES, getSlideBgStyle } from '../components/SlidesEditor';
import { WS_URL as WS_BASE } from '../config';

const WS_URL = WS_BASE + '/yjs';

export default function PresentPage() {
  const { id } = useParams();
  const [slides, setSlides] = useState(null);
  const [idx, setIdx] = useState(0);
  const [, bump] = useState(0);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WS_URL, id, ydoc);
    const arr = ydoc.getArray('slides');
    const obs = () => bump(x => x + 1);
    arr.observe(obs);
    setSlides(arr);
    const bc = new BroadcastChannel('cs-present-' + id);
    bc.onmessage = (e) => {
      if (e.data?.type === 'idx') setIdx(e.data.idx);
    };
    return () => {
      arr.unobserve(obs);
      provider.destroy();
      ydoc.destroy();
      bc.close();
    };
  }, [id]);

  if (!slides || slides.length === 0) {
    return <div style={{ color: '#fff', padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>Waiting for presentation broadcast...</div>;
  }

  const slide = slides.get(Math.min(idx, slides.length - 1));
  if (!slide) return null;

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <div
        key={idx}
        className={`ppt-fullscreen-slide anim-${slide.get('animation') || 'fade'} trans-${slide.get('transition') || 'fade'}`}
        style={{
          ...getSlideBgStyle(slide),
          width: '94vw',
          height: '88vh',
          animationDuration: slide.get('tspeed') || '0.5s',
        }}
      >
        <div className="fullscreen-slide-title">{slide.get('title')}</div>
        <div className="fullscreen-slide-body">{slide.get('body')}</div>
      </div>
    </div>
  );
}