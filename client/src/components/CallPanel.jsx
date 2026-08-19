import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MonitorUp, X, Users, MessageCircle, Maximize2, Minimize2, Send } from 'lucide-react';
import { API, useAuthStore } from '../store/authStore';

import { WS_URL } from '../config';
const RTC_URL = WS_URL + '/rtc';

const RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    {
      urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

// ✅ Treat DB timestamps as UTC, display in the viewer's local timezone
const dbDate = (s) => {
  if (!s) return new Date();
  const str = String(s);
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(str)) return new Date(str); // already has timezone
  return new Date(str.replace(' ', 'T') + 'Z');               // Neon UTC wall-clock
};

function VideoTile({ stream, name, isSelf, small }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div style={{ position: 'relative', background: '#0b0e14', borderRadius: small ? 8 : 12, overflow: 'hidden', aspectRatio: '4/3', width: small ? 150 : '100%', flexShrink: 0 }}>
      <video ref={ref} autoPlay playsInline muted={isSelf}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isSelf ? 'scaleX(-1)' : 'none' }} />
      <span style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 10, color: '#fff', background: 'rgba(0,0,0,.55)', padding: '1px 6px', borderRadius: 5 }}>
        {name}{isSelf ? ' (you)' : ''}
      </span>
    </div>
  );
}

export default function CallPanel({ docId, provider }) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [sigOk, setSigOk] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [peers, setPeers] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [incoming, setIncoming] = useState(null);
  const chatListRef = useRef(null);
  const dismissedRef = useRef(0);

  const wsRef = useRef(null);
  const pcsRef = useRef({});
  const pendingCandidates = useRef({});
  const attemptsRef = useRef({});
  const localRef = useRef(null);
  const camRef = useRef(null);
  const inCallRef = useRef(false);
  const myId = useRef(Math.random().toString(36).slice(2, 10));

  inCallRef.current = inCall;
  localRef.current = localStream;

  /* ===== ✅ INCOMING CALL INVITES (via Yjs awareness) ===== */
  useEffect(() => {
    if (!provider) return;
    const aw = provider.awareness;
    const onChange = () => {
      let invite = null;
      Array.from(aw.getStates().values()).forEach((s) => {
        if (s.callInvite && s.callInvite.active && Date.now() - s.callInvite.ts < 60000 && s.callInvite.ts > dismissedRef.current) {
          invite = s.callInvite;
        }
      });
      setIncoming(inCallRef.current ? null : invite);
    };
    aw.on('change', onChange);
    onChange();
    return () => aw.off('change', onChange);
  }, [provider]);

  /* ===== ✅ Ringtone while invite visible ===== */
  useEffect(() => {
    if (!incoming) return;
    let ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    const beep = () => {
      try {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880; g.gain.value = 0.06;
        o.start(); setTimeout(() => o.stop(), 180);
      } catch {}
    };
    beep();
    const t = setInterval(beep, 1200);
    return () => { clearInterval(t); ctx.close().catch(() => {}); };
  }, [incoming]);

  /* ===== TEAM CHAT ===== */
  useEffect(() => {
    if (!chatOpen) return;
    const load = () => API.get(`/documents/${docId}/messages`).then(r => setMessages(r.data || [])).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [chatOpen, docId]);

  useEffect(() => {
    if (chatListRef.current) chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [messages, chatOpen]);

  async function sendMessage() {
    if (!text.trim()) return;
    try {
      const { data } = await API.post(`/documents/${docId}/messages`, { text: text.trim() });
      const full = { ...data, username: data.username || user?.username || 'Guest' };
      setMessages(m => [...m.filter(x => x.id !== full.id), full]);
      sendSignal({ action: 'chat', msg: full });
      setText('');
    } catch {}
  }

  /* ===== SIGNALING ===== */
  function sendSignal(msg) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) return;
    console.log('[rtc] send:', msg.action, msg.to ? '→ ' + msg.to : '(all)');
    try { ws.send(JSON.stringify({ ...msg, from: myId.current, name: user?.username || 'Guest' })); } catch {}
  }

  async function flushCandidates(peerId) {
    const pc = pcsRef.current[peerId];
    const q = pendingCandidates.current[peerId] || [];
    if (pc && pc.remoteDescription) {
      for (const c of q) { try { await pc.addIceCandidate(c); } catch {} }
      pendingCandidates.current[peerId] = [];
    }
  }

  function createPC(peerId) {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pendingCandidates.current[peerId] = [];
    pc.onicecandidate = (e) => { if (e.candidate) sendSignal({ action: 'candidate', to: peerId, candidate: e.candidate }); };
    pc.ontrack = (e) => {
      console.log('[rtc] ontrack from', peerId);
      setPeers(p => ({ ...p, [peerId]: { ...(p[peerId] || {}), stream: e.streams[0] } }));
    };
    pc.onconnectionstatechange = () => {
      console.log('[rtc] state', peerId, pc.connectionState);
      if (pc.connectionState === 'connected') attemptsRef.current[peerId] = 0;
      if (['failed', 'closed'].includes(pc.connectionState)) {
        setPeers(p => { const n = { ...p }; delete n[peerId]; return n; });
      }
    };
    (localRef.current?.getTracks() || []).forEach(t => pc.addTrack(t, localRef.current));
    pcsRef.current[peerId] = pc;
    return pc;
  }

  async function initiateOffer(peerId) {
    try {
      if (pcsRef.current[peerId]) { try { pcsRef.current[peerId].close(); } catch {} delete pcsRef.current[peerId]; }
      const pc = createPC(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ action: 'offer', to: peerId, sdp: offer });
    } catch (e) { console.error('[rtc] offer error:', e); }
  }

  async function handleSignal(msg) {
    if (msg.from === myId.current) return;
    console.log('[rtc] recv:', msg.action, 'from', msg.from);
    try {
      if (msg.action === 'chat') {
        if (msg.msg) setMessages(m => [...m.filter(x => x.id !== msg.msg.id), msg.msg]);
        return;
      }
      if (!inCallRef.current) return;

      if (msg.action === 'join') {
        const pc = pcsRef.current[msg.from];
        if (pc && !['failed', 'closed'].includes(pc.connectionState)) {
          setPeers(p => ({ ...p, [msg.from]: { ...(p[msg.from] || {}), name: msg.name } }));
          return;
        }
        setPeers(p => ({ ...p, [msg.from]: { ...(p[msg.from] || {}), name: msg.name } }));
        sendSignal({ action: 'present', to: msg.from });
        if (myId.current < msg.from) initiateOffer(msg.from);
      }
      else if (msg.action === 'present') {
        if (msg.to !== myId.current) return;
        const pc = pcsRef.current[msg.from];
        if (pc && !['failed', 'closed'].includes(pc.connectionState)) return;
        setPeers(p => ({ ...p, [msg.from]: { ...(p[msg.from] || {}), name: msg.name } }));
        if (myId.current < msg.from) initiateOffer(msg.from);
      }
      else if (msg.action === 'offer' && msg.to === myId.current) {
        setPeers(p => ({ ...p, [msg.from]: { ...(p[msg.from] || {}), name: msg.name } }));
        let pc = pcsRef.current[msg.from] || createPC(msg.from);
        try {
          if (pc.signalingState === 'have-local-offer') {
            if (myId.current < msg.from) return;
            try { await pc.setLocalDescription({ type: 'rollback' }); } catch {}
          }
          await pc.setRemoteDescription(msg.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ action: 'answer', to: msg.from, sdp: answer });
          await flushCandidates(msg.from);
        } catch (e) { console.error('[rtc] offer handling failed:', e); }
      }
      else if (msg.action === 'answer' && msg.to === myId.current) {
        const pc = pcsRef.current[msg.from];
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(msg.sdp);
          await flushCandidates(msg.from);
        }
      }
      else if (msg.action === 'candidate' && msg.to === myId.current) {
        const pc = pcsRef.current[msg.from];
        if (!pc || !pc.remoteDescription) {
          (pendingCandidates.current[msg.from] = pendingCandidates.current[msg.from] || []).push(msg.candidate);
          return;
        }
        try { await pc.addIceCandidate(msg.candidate); } catch {}
      }
      else if (msg.action === 'leave') {
        pcsRef.current[msg.from]?.close();
        delete pcsRef.current[msg.from];
        setPeers(p => { const n = { ...p }; delete n[msg.from]; return n; });
      }
    } catch (e) { console.error('[rtc] signal error:', e); }
  }

  function connectSignaling() {
    try { if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); } } catch {}
    const ws = new WebSocket(`${RTC_URL}/${docId}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    ws.onopen = () => { setSigOk(true); sendSignal({ action: 'join' }); };
    ws.onerror = () => setSigOk(false);
    ws.onclose = () => {
      setSigOk(false);
      if (inCallRef.current) setTimeout(() => { if (inCallRef.current) connectSignaling(); }, 2000);
    };
    ws.onmessage = async (ev) => {
      try {
        let text;
        if (typeof ev.data === 'string') text = ev.data;
        else if (ev.data instanceof ArrayBuffer) text = new TextDecoder().decode(ev.data);
        else text = new TextDecoder().decode(await ev.data.arrayBuffer());
        handleSignal(JSON.parse(text));
      } catch (e) {
        console.warn('[rtc] ignored non-JSON frame');
      }
    };
  }

  // Re-announce + watchdog
  useEffect(() => {
    if (!inCall) return;
    const t = setInterval(() => {
      sendSignal({ action: 'join' });
      Object.entries(pcsRef.current).forEach(([pid, pc]) => {
        if (pc.connectionState === 'new' && myId.current < pid) {
          attemptsRef.current[pid] = (attemptsRef.current[pid] || 0) + 1;
          if (attemptsRef.current[pid] <= 6) {
            console.log('[rtc] watchdog re-offer →', pid);
            initiateOffer(pid);
          }
        }
      });
    }, 3000);
    return () => clearInterval(t);
  }, [inCall]);

  /* ===== LIFECYCLE ===== */
  async function startCall(thenScreen = false) {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); }
    catch {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { return alert('Camera & microphone access was denied.'); }
    }
    camRef.current = stream;
    localRef.current = stream;
    setLocalStream(stream);
    setInCall(true);
    setOpen(false);
    setExpanded(false);
    setIncoming(null);
    connectSignaling();
    try { provider?.awareness?.setLocalStateField('callInvite', { active: true, name: user?.username || 'Guest', ts: Date.now() }); } catch {}
    if (thenScreen) setTimeout(() => shareScreen(), 700);
  }

  async function shareScreen() {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screen.getVideoTracks()[0];
      Object.values(pcsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });
      const preview = new MediaStream([screenTrack, ...(localRef.current?.getAudioTracks() || [])]);
      setLocalStream(preview);
      setSharing(true);
      screenTrack.onended = () => stopScreen();
    } catch {}
  }

  function stopScreen() {
    const camTrack = camRef.current?.getVideoTracks()[0];
    Object.values(pcsRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && camTrack) sender.replaceTrack(camTrack);
    });
    localRef.current?.getVideoTracks().forEach(t => { if (t !== camTrack) t.stop(); });
    setLocalStream(camRef.current);
    setSharing(false);
  }

  function endCall() {
    inCallRef.current = false;
    sendSignal({ action: 'leave' });
    try { provider?.awareness?.setLocalStateField('callInvite', { active: false, ts: Date.now() }); } catch {}
    try { if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; } } catch {}
    Object.values(pcsRef.current).forEach(pc => pc.close());
    pcsRef.current = {};
    localRef.current?.getTracks().forEach(t => t.stop());
    camRef.current?.getTracks().forEach(t => t.stop());
    setLocalStream(null); setPeers({}); setInCall(false); setExpanded(false); setChatOpen(false);
    setSigOk(false); setMuted(false); setCamOff(false); setSharing(false);
  }

  useEffect(() => () => {
    try { wsRef.current?.close(); } catch {}
    Object.values(pcsRef.current).forEach(pc => pc.close());
  }, []);

  function toggleMic() { localRef.current?.getAudioTracks().forEach(t => (t.enabled = muted)); setMuted(!muted); }
  function toggleCam() { camRef.current?.getVideoTracks().forEach(t => (t.enabled = camOff)); setCamOff(!camOff); }

  const Controls = ({ big }) => (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
      <button className={`btn btn-icon ${muted ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleMic} title="Mic">
        {muted ? <MicOff size={15} /> : <Mic size={15} />}
      </button>
      <button className={`btn btn-icon ${camOff ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleCam} title="Camera">
        {camOff ? <VideoOff size={15} /> : <Video size={15} />}
      </button>
      <button className={`btn ${sharing ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: big ? '10px 14px' : '6px 10px', fontSize: 12.5 }} onClick={sharing ? stopScreen : shareScreen}>
        <MonitorUp size={14} /> {sharing ? 'Stop' : 'Share Screen'}
      </button>
      <button className={`btn btn-icon ${chatOpen ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setChatOpen(c => !c)} title="Team Chat">
        <MessageCircle size={15} />
      </button>
      <button className="btn btn-icon btn-ghost" onClick={() => setExpanded(x => !x)} title={expanded ? 'Minimize' : 'Expand'}>
        {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
      <button className="btn btn-danger" style={{ padding: big ? '10px 14px' : '6px 10px', fontSize: 12.5 }} onClick={endCall}>
        <PhoneOff size={14} /> Leave
      </button>
    </div>
  );

  return (
    <>
      {/* ✅ Incoming call banner */}
      {incoming && !inCall && (
        <div className="call-invite glass">
          <Video size={18} className="pulse" />
          <div style={{ fontSize: 13.5 }}><b>{incoming.name}</b> started a Team Call</div>
          <button className="btn btn-primary" style={{ padding: '8px 14px' }} onClick={() => startCall()}>Join</button>
          <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={() => { dismissedRef.current = incoming.ts; setIncoming(null); }}>Dismiss</button>
        </div>
      )}

      {!open && !inCall && (
        <button className="call-fab" onClick={() => setOpen(true)} title="Team Call"><Video size={18} /> Call</button>
      )}

      {open && !inCall && (
        <div className="modal-backdrop" style={{ background: 'rgba(10,12,20,.45)' }} onClick={() => setOpen(false)}>
          <div className="modal glass" style={{ maxWidth: 720, width: '94vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Video size={18} /> Team Call</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: '18px 4px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                Join the call — everyone in this document gets an instant invitation. The editor stays fully editable while the dock floats in the corner.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ padding: '12px 18px' }} onClick={() => startCall(false)}><Video size={16} /> Start Camera</button>
                <button className="btn btn-ghost" style={{ padding: '12px 18px' }} onClick={() => startCall(true)}><MonitorUp size={16} /> Share Screen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {inCall && !expanded && (
        <div className="call-dock glass">
          <div className="dock-tiles">
            <VideoTile small stream={localStream} name={user?.username || 'Guest'} isSelf />
            {Object.entries(peers).map(([pid, p]) => <VideoTile key={pid} small stream={p.stream} name={p.name || 'Guest'} />)}
          </div>
          <div className="dock-controls"><Controls /></div>
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
            {sigOk ? '🟢' : '🔴'} <Users size={11} style={{ verticalAlign: -2 }} /> {Object.keys(peers).length + 1} in call
          </div>
        </div>
      )}

      {inCall && expanded && (
        <div className="modal-backdrop" style={{ background: 'rgba(10,12,20,.55)' }} onClick={() => setExpanded(false)}>
          <div className="modal glass" style={{ maxWidth: 860, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Video size={18} /> Team Call</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setExpanded(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, maxHeight: '55vh', overflowY: 'auto', padding: '14px 0' }}>
              <VideoTile stream={localStream} name={user?.username || 'Guest'} isSelf />
              {Object.entries(peers).map(([pid, p]) => <VideoTile key={pid} stream={p.stream} name={p.name || 'Guest'} />)}
            </div>
            <Controls big />
          </div>
        </div>
      )}

      {chatOpen && (
        <aside className="team-chat glass">
          <header>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MessageCircle size={16} /> Team Chat</span>
            <button className="btn btn-ghost btn-icon" onClick={() => setChatOpen(false)}><X size={16} /></button>
          </header>
          <div className="chat-list" ref={chatListRef}>
            {messages.length === 0 && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20, fontSize: 13 }}>No messages yet. Say hi to your team!</div>}
            {messages.map(msg => (
              <div key={msg.id} className={`chat-bubble ${String(msg.user_id) === String(user?.id) ? 'mine' : 'theirs'}`}>
                <div className="chat-meta">
                  <span style={{ fontWeight: 700 }}>{msg.username || 'User'}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{dbDate(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="chat-text">{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="chat-input-wrap">
            <input className="input" placeholder="Message the team…" value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()} />
            <button className="btn btn-primary btn-icon" onClick={sendMessage}><Send size={15} /></button>
          </div>
        </aside>
      )}
    </>
  );
}