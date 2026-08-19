const Y = require('yjs');
const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
const db = require('./db');

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const docs = new Map();

const loadFromDB = async (docId, ydoc) => {
  try {
    const res = await db.query('SELECT yjs_state FROM documents WHERE id = $1', [docId]);
    if (res.rows[0] && res.rows[0].yjs_state) {
      const state = res.rows[0].yjs_state;
      const buf = Buffer.isBuffer(state) ? state : Buffer.from(state, 'binary');
      if (buf && buf.length > 0) {
        try {
          Y.applyUpdate(ydoc, buf);
        } catch (applyErr) {
          console.error(`⚠️ Corrupted Yjs state in DB for doc ${docId}. Wiping.`);
          await db.query('UPDATE documents SET yjs_state = NULL WHERE id = $1', [docId]);
        }
      }
    }
  } catch (err) { console.error('Yjs load error:', err.message); }
};

const saveToDB = async (docId, ydoc) => {
  try {
    const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
    if (state.length === 0) return;
    await db.query('UPDATE documents SET yjs_state = $1, updated_at = NOW() WHERE id = $2', [state, docId]);
  } catch (err) { console.error('Yjs save error:', err.message); }
};

const getDoc = (docId) => {
  if (docs.has(docId)) return docs.get(docId);
  const ydoc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(ydoc);
  const entry = { ydoc, awareness, conns: new Set(), saveTimer: null };
  docs.set(docId, entry);
  loadFromDB(docId, ydoc);
  ydoc.on('update', () => {
    clearTimeout(entry.saveTimer);
    entry.saveTimer = setTimeout(() => saveToDB(docId, ydoc), 2000);
  });
  return entry;
};

const send = (conn, data) => { if (conn.readyState === 1) conn.send(data); };

const handleConnection = (conn, docId) => {
  const entry = getDoc(docId);
  const { ydoc, awareness } = entry;
  entry.conns.add(conn);
  conn.controlledIds = new Set();

  const docUpdateHandler = (update, origin) => {
    if (origin !== conn) {
      try {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MESSAGE_SYNC);
        syncProtocol.writeUpdate(enc, update);
        send(conn, encoding.toUint8Array(enc));
      } catch (e) { console.error('Error sending update:', e.message); }
    }
  };
  ydoc.on('update', docUpdateHandler);

  const awarenessUpdateHandler = (changes, origin) => {
    if (origin === conn) {
      changes.added.concat(changes.updated).forEach((id) => conn.controlledIds.add(id));
      return;
    }
    try {
      const changed = changes.added.concat(changes.updated, changes.removed);
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
      send(conn, encoding.toUint8Array(enc));
    } catch (e) { console.error('Error sending awareness:', e.message); }
  };
  awareness.on('update', awarenessUpdateHandler);

  conn.on('message', (data) => {
    try {
      const dec = decoding.createDecoder(new Uint8Array(data));
      const type = decoding.readVarUint(dec);
      if (type === MESSAGE_SYNC) {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(dec, enc, ydoc, conn);
        if (encoding.length(enc)) send(conn, encoding.toUint8Array(enc));
      } else if (type === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(dec), conn);
      }
    } catch (err) { 
      // ✅ Catches the "Unexpected end of array" error and prevents the socket from crashing!
      console.warn('⚠️ Ignoring malformed WS message:', err.message); 
    }
  });

  try {
    const initEnc = encoding.createEncoder();
    encoding.writeVarUint(initEnc, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(initEnc, ydoc);
    send(conn, encoding.toUint8Array(initEnc));

    const states = awareness.getStates();
    if (states.size > 0) {
      const awEnc = encoding.createEncoder();
      encoding.writeVarUint(awEnc, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(awEnc, awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(states.keys())));
      send(conn, encoding.toUint8Array(awEnc));
    }
  } catch (e) {
    console.error('❌ Error sending initial sync:', e.message);
  }

  conn.on('close', () => {
    entry.conns.delete(conn);
    ydoc.off('update', docUpdateHandler);
    awareness.off('update', awarenessUpdateHandler);
    if (conn.controlledIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(awareness, Array.from(conn.controlledIds), conn);
    }
    if (entry.conns.size === 0) {
      clearTimeout(entry.saveTimer);
      saveToDB(docId, ydoc);
      setTimeout(() => {
        if (entry.conns.size === 0) { docs.delete(docId); ydoc.destroy(); awareness.destroy(); }
      }, 5000);
    }
  });
};

module.exports = { handleConnection };