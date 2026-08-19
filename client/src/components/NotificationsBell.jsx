import { useEffect, useState } from 'react';
import { API } from '../store/authStore';
import { Bell, CheckCheck } from 'lucide-react';

export default function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const load = () => API.get('/notifications').then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);
  const unread = items.filter(i => !i.read).length;
  const markRead = () => API.post('/notifications/read').then(() => { setOpen(false); load(); });

  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-ghost btn-icon" onClick={() => setOpen(!open)}>
        <Bell size={16} />
        {unread > 0 && <span className="bell-badge">{unread}</span>}
      </button>
      {open && (
        <div className="menu" style={{ top: 40, right: 0, width: 320, maxHeight: 380, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
            <b style={{ fontSize: 13 }}>Notifications</b>
            <button className="btn btn-ghost btn-icon" onClick={markRead} title="Mark all read"><CheckCheck size={14} /></button>
          </div>
          {items.length === 0 && <div className="empty-state-small">No notifications yet</div>}
          {items.map(n => (
            <div key={n.id} style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontSize: 13, opacity: n.read ? .6 : 1 }}>
              {n.text}
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}