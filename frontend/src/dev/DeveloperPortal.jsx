import React, { useState, useEffect, useRef, useCallback } from 'react';
import devApi, { getDevToken, setDevToken, clearDevToken } from './devApi';
import { UNLOCK_WORD } from './devConfig';

// ---------------------------------------------------------------------------
// Decoy: looks like an ordinary "page not found". Typing the secret word
// anywhere on this screen reveals the developer login.
// ---------------------------------------------------------------------------
const Decoy = ({ onUnlock }) => {
  const buffer = useRef('');
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) {
        buffer.current = (buffer.current + e.key.toLowerCase()).slice(-40);
        if (buffer.current.endsWith(UNLOCK_WORD.toLowerCase())) {
          buffer.current = '';
          onUnlock();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onUnlock]);

  return (
    <div style={decoyWrap}>
      <div style={{ textAlign: 'center', fontFamily: 'system-ui, sans-serif', color: '#64748b' }}>
        <h1 style={{ fontSize: 72, margin: 0, color: '#94a3b8' }}>404</h1>
        <p style={{ fontSize: 16, marginTop: 8 }}>This page could not be found.</p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Login: phone + password + 6-digit authenticator code
// ---------------------------------------------------------------------------
const Login = ({ onSuccess }) => {
  const [form, setForm] = useState({ phone: '', password: '', token: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await devApi.post('/auth/login', form);
      setDevToken(res.data.token);
      onSuccess();
    } catch (err) {
      setError('Access denied.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...decoyWrap, background: '#0b1220' }}>
      <form onSubmit={submit} style={card}>
        <h2 style={{ margin: '0 0 4px', color: '#e2e8f0', fontSize: 20 }}>Developer Access</h2>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>Restricted. Authentication required.</p>
        <input style={input} placeholder="Phone" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} autoFocus />
        <input style={input} type="password" placeholder="Password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input style={input} placeholder="6-digit code" inputMode="numeric" maxLength={6} value={form.token}
          onChange={(e) => setForm({ ...form, token: e.target.value.replace(/\D/g, '') })} />
        {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={busy} style={btnPrimary}>{busy ? 'Verifying…' : 'Enter'}</button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Panel: collection browser + stats + per-document edit/delete
// ---------------------------------------------------------------------------
const Panel = ({ onLogout }) => {
  const [stats, setStats] = useState(null);
  const [collections, setCollections] = useState([]);
  const [active, setActive] = useState(null);
  const [data, setData] = useState({ documents: [], total: 0, page: 1, pages: 1, fields: [] });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // { id, text }
  const [editError, setEditError] = useState('');

  const loadMeta = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([devApi.get('/stats'), devApi.get('/collections')]);
      setStats(s.data);
      setCollections(c.data.collections);
    } catch (err) {
      if (err.response?.status === 404) onLogout();
    }
  }, [onLogout]);

  const loadDocuments = useCallback(async (name, p = 1, search = '') => {
    if (!name) return;
    setLoading(true);
    try {
      const res = await devApi.get(`/collections/${name}`, { params: { page: p, limit: 25, q: search } });
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 404) onLogout();
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { if (active) loadDocuments(active, page, q); /* eslint-disable-next-line */ }, [active, page]);

  const openCollection = (name) => { setActive(name); setPage(1); setQ(''); loadDocuments(name, 1, ''); };

  const saveEdit = async () => {
    setEditError('');
    let parsed;
    try { parsed = JSON.parse(editing.text); } catch { setEditError('Invalid JSON'); return; }
    try {
      await devApi.put(`/collections/${active}/${editing.id}`, parsed);
      setEditing(null);
      loadDocuments(active, page, q);
    } catch (err) { setEditError(err.response?.data?.message || 'Save failed'); }
  };

  const deleteDoc = async (id) => {
    if (!window.confirm('Delete this document permanently?')) return;
    try {
      await devApi.delete(`/collections/${active}/${id}`);
      loadDocuments(active, page, q);
      loadMeta();
    } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const columns = data.documents.length
    ? ['_id', ...Object.keys(data.documents[0]).filter((k) => k !== '_id').slice(0, 5)]
    : ['_id'];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0b1220', color: '#e2e8f0', fontFamily: 'ui-monospace, monospace' }}>
      {/* Sidebar */}
      <aside style={sidebar}>
        <div style={{ padding: '16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Developer Panel</div>
          <button onClick={onLogout} style={{ ...btnGhost, marginTop: 8 }}>Logout</button>
        </div>
        {stats && (
          <div style={{ padding: 12, fontSize: 11, color: '#94a3b8', borderBottom: '1px solid #1e293b', lineHeight: 1.8 }}>
            <div>Collections: <b style={{ color: '#e2e8f0' }}>{stats.collections}</b></div>
            <div>Vendors: <b style={{ color: '#e2e8f0' }}>{stats.vendors}</b></div>
            <div>Bookings: <b style={{ color: '#e2e8f0' }}>{stats.bookings}</b></div>
            <div>Wallet revenue: <b style={{ color: '#34d399' }}>₹{stats.walletRevenue}</b></div>
            {Object.entries(stats.usersByRole).map(([r, n]) => (
              <div key={r}>{r}: <b style={{ color: '#e2e8f0' }}>{n}</b></div>
            ))}
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {collections.map((c) => (
            <button key={c.name} onClick={() => openCollection(c.name)}
              style={{ ...collItem, background: active === c.name ? '#1e293b' : 'transparent' }}>
              <span>{c.name}</span>
              <span style={{ color: '#64748b' }}>{c.count}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!active ? (
          <div style={{ margin: 'auto', color: '#64748b' }}>Select a collection</div>
        ) : (
          <>
            <div style={{ padding: 12, borderBottom: '1px solid #1e293b', display: 'flex', gap: 8, alignItems: 'center' }}>
              <b>{active}</b>
              <input style={{ ...input, margin: 0, flex: 1, maxWidth: 360 }} placeholder="Search (text or _id)…"
                value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); loadDocuments(active, 1, q); } }} />
              <button style={btnGhost} onClick={() => { setPage(1); loadDocuments(active, 1, q); }}>Search</button>
              <span style={{ color: '#64748b', fontSize: 12 }}>{data.total} docs</span>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              {loading ? <div style={{ padding: 20, color: '#64748b' }}>Loading…</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>{columns.map((c) => <th key={c} style={th}>{c}</th>)}<th style={th}>actions</th></tr>
                  </thead>
                  <tbody>
                    {data.documents.map((doc) => (
                      <tr key={doc._id} style={{ borderBottom: '1px solid #1e293b' }}>
                        {columns.map((c) => <td key={c} style={td}>{cell(doc[c])}</td>)}
                        <td style={td}>
                          <button style={btnTiny} onClick={() => { setEditing({ id: doc._id, text: JSON.stringify(doc, null, 2) }); setEditError(''); }}>edit</button>
                          <button style={{ ...btnTiny, color: '#f87171' }} onClick={() => deleteDoc(doc._id)}>del</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: 10, borderTop: '1px solid #1e293b', display: 'flex', gap: 10, alignItems: 'center' }}>
              <button style={btnGhost} disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span style={{ fontSize: 12 }}>Page {data.page} / {data.pages || 1}</span>
              <button style={btnGhost} disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </>
        )}
      </main>

      {/* Edit modal */}
      {editing && (
        <div style={modalWrap} onClick={() => setEditing(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <b>Edit document</b>
              <button style={btnGhost} onClick={() => setEditing(null)}>✕</button>
            </div>
            <textarea style={textarea} value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })} spellCheck={false} />
            {editError && <div style={{ color: '#f87171', fontSize: 12, margin: '8px 0' }}>{editError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button style={btnPrimary} onClick={saveEdit}>Save</button>
              <button style={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const cell = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60);
  return String(v).slice(0, 60);
};

// ---------------------------------------------------------------------------
const DeveloperPortal = () => {
  const [stage, setStage] = useState('decoy'); // decoy | login | panel
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      if (getDevToken()) {
        try { await devApi.get('/auth/me'); setStage('panel'); }
        catch { clearDevToken(); }
      }
      setChecking(false);
    })();
  }, []);

  const logout = () => { clearDevToken(); setStage('decoy'); };

  if (checking) return <div style={decoyWrap} />;
  if (stage === 'panel') return <Panel onLogout={logout} />;
  if (stage === 'login') return <Login onSuccess={() => setStage('panel')} />;
  return <Decoy onUnlock={() => setStage('login')} />;
};

// --- inline styles (kept self-contained so the panel shares no app classes) ---
const decoyWrap = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' };
const card = { width: 320, background: '#111a2e', border: '1px solid #1e293b', borderRadius: 12, padding: 24 };
const input = { width: '100%', boxSizing: 'border-box', marginBottom: 12, padding: '11px 12px', background: '#0b1220', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none' };
const btnPrimary = { padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', width: '100%' };
const btnGhost = { padding: '6px 12px', background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: 6, cursor: 'pointer', fontSize: 12 };
const btnTiny = { padding: '2px 8px', background: 'transparent', color: '#60a5fa', border: '1px solid #1e293b', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 };
const sidebar = { width: 240, background: '#0d1526', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column' };
const collItem = { width: '100%', display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #141f36', color: '#cbd5e1', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' };
const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #1e293b', color: '#64748b', position: 'sticky', top: 0, background: '#0b1220', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', color: '#cbd5e1', whiteSpace: 'nowrap', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' };
const modalWrap = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalCard = { width: 'min(720px, 92vw)', maxHeight: '86vh', overflow: 'auto', background: '#111a2e', border: '1px solid #1e293b', borderRadius: 12, padding: 20 };
const textarea = { width: '100%', boxSizing: 'border-box', height: 360, background: '#0b1220', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontFamily: 'ui-monospace, monospace', fontSize: 12, padding: 12, outline: 'none' };

export default DeveloperPortal;
