import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { encoding, decoding } from 'lib0';
import { useAuthStore } from '../store/authStore';

const MSG_SIGNAL = 5;

function VideoTile({ stream, name, isSelf }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div style={{ position: 'relative', background: '#0b0e14', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3' }}>
      <video ref={ref} autoPlay playsInline muted={isSelf}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isSelf ? 'scaleX(-1)' : 'none' }} />
      <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 11, color: '#fff', background: 'rgba(0,0,0,.55)', padding: '2px 8px', borderRadius: 6 }}>
        {name}{isSelf ? ' (you)' : ''}
      </span>
    </div>
  );
}

export default function CallPanel({ docId, provider }) {
  const { user } = useAuthStore();
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [peers, setPeers] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const inCallRef = useRef(false);
  const localRef = useRef(null);
  const pcs = useRef({});
  const myId = useRef(Math.random().toString(36).slice(2, 10));

  inCallRef.current = inCall;
  localRef.current = localStream;

  const sendSignal = (msg) => {
    const ws = provider?.ws;
    if (!ws || ws.readyState !== 1) return;
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SIGNAL);
    encoding.writeVarUint8Array(enc, new TextEncoder().encode(JSON.stringify({
      ...msg, from: myId.current, name: user?.username || 'Guest',
    })));
    try { ws.send(encoding.toUint8Array(enc)); } catch {}
  };

  const createPC = (peerId) => {
    const pc = new RTCPeerConnection({ iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]});
    pc.onicecandidate = (e) => { if (e.candidate) sendSignal({ action: 'candidate', to: peerId, candidate: e.candidate }); };
    pc.ontrack = (e) => setPeers(p => ({ ...p, [peerId]: { ...(p[peerId] || {}), stream: e.streams[0] } }));
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        setPeers(p => { const n = { ...p }; delete n[peerId]; return n; });
      }
    };
    (localRef.current?.getTracks() || []).forEach(t => pc.addTrack(t, localRef.current));
    pcs.current[peerId] = pc;
    return pc;
  };

  const handleSignal = async (msg) => {
    if (msg.from === myId.current || !inCallRef.current) return;
    try {
      if (msg.action === 'join') {
        setPeers(p => ({ ...p, [msg.from]: { ...(p[msg.from] || {}), name: msg.name } }));
        const pc = createPC(msg.from);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ action: 'offer', to: msg.from, sdp: offer });
      } else if (msg.action === 'offer' && msg.to === myId.current) {
        setPeers(p => ({ ...p, [msg.from]: { ...(p[msg.from] || {}), name: msg.name } }));
        const pc = pcs.current[msg.from] || createPC(msg.from);
        await pc.setRemoteDescription(msg.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ action: 'answer', to: msg.from, sdp: answer });
      } else if (msg.action === 'answer' && msg.to === myId.current) {
        const pc = pcs.current[msg.from];
        if (pc && !pc.currentRemoteDescription) await pc.setRemoteDescription(msg.sdp);
      } else if (msg.action === 'candidate' && msg.to === myId.current) {
        const pc = pcs.current[msg.from];
        if (pc) { try { await pc.addIceCandidate(msg.candidate); } catch {} }
      } else if (msg.action === 'leave') {
        pcs.current[msg.from]?.close();
        delete pcs.current[msg.from];
        setPeers(p => { const n = { ...p }; delete n[msg.from]; return n; });
      }
    } catch (e) { console.error('signal error:', e); }
  };

  // Attach listener to the y-websocket connection (re-attaches on reconnect)
  useEffect(() => {
    if (!provider) return;
    let ws = null;
    const onMsg = (ev) => {
      if (!(ev.data instanceof ArrayBuffer)) return;
      try {
        const dec = decoding.createDecoder(new Uint8Array(ev.data));
        const type = decoding.readVarUint(dec);
        if (type !== MSG_SIGNAL) return;
        handleSignal(JSON.parse(new TextDecoder().decode(decoding.readVarUint8Array(dec))));
      } catch {}
    };
    const t = setInterval(() => {
      if (provider.ws && provider.ws !== ws) {
        ws?.removeEventListener('message', onMsg);
        ws = provider.ws;
        ws.addEventListener('message', onMsg);
      }
    }, 250);
    return () => { clearInterval(t); ws?.removeEventListener('message', onMsg); };
  }, [provider]);

  const startCall = async () => {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); }
    catch {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { return alert('Camera & microphone access was denied.'); }
    }
    setLocalStream(stream);
    setInCall(true);
    setTimeout(() => sendSignal({ action: 'join' }), 400);
  };

  const endCall = () => {
    sendSignal({ action: 'leave' });
    Object.values(pcs.current).forEach(pc => pc.close());
    pcs.current = {};
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setPeers({});
    setInCall(false);
    setMuted(false);
    setCamOff(false);
  };

  const toggleMic = () => { localStream?.getAudioTracks().forEach(t => (t.enabled = muted)); setMuted(!muted); };
  const toggleCam = () => { localStream?.getVideoTracks().forEach(t => (t.enabled = camOff)); setCamOff(!camOff); };

  return (
    <>
      {!inCall ? (
        <button className="call-fab" onClick={startCall} title="Start video call">
          <Video size={18} /> Call
        </button>
      ) : (
        <div className="call-panel glass">
          <div className="call-grid">
            <VideoTile stream={localStream} name={user?.username || 'Guest'} isSelf />
            {Object.entries(peers).map(([pid, p]) => (
              <VideoTile key={pid} stream={p.stream} name={p.name || 'Guest'} />
            ))}
          </div>
          <div className="call-controls">
            <button className={`btn btn-icon ${muted ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleMic}>
              {muted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button className={`btn btn-icon ${camOff ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleCam}>
              {camOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>
            <button className="btn btn-danger" onClick={endCall}><PhoneOff size={16} /> Leave</button>
          </div>
        </div>
      )}
    </>
  );
}