import React, { useState, useEffect } from 'react';

const s = {
  wrap:    { padding: 16, display: 'flex', flexDirection: 'column', gap: 16 },
  section: { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' },
  sTitle:  { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#9CA3AF', padding: '12px 14px 0' },
  row:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #F3F4F6' },
  rowLast: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' },
  label:   { fontSize: 13, fontWeight: 500 },
  sub:     { fontSize: 11, color: '#6B7280', marginTop: 2 },
  input:   { padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: 180, outline: 'none' },
  numInput:{ padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: 80, textAlign: 'right', outline: 'none' },
  toggle:  { position: 'relative', width: 38, height: 22, flexShrink: 0 },
  saveBtn: { width: '100%', padding: 12, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background .15s' },
  saved:   { textAlign: 'center', color: '#16A34A', fontSize: 13, fontWeight: 500 },
};

function Toggle({ value, onChange }) {
  return (
    <label style={s.toggle}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 11,
        background: value ? '#2563EB' : '#D1D5DB', transition: 'background .2s', cursor: 'pointer'
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 18 : 2, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)'
        }} />
      </div>
    </label>
  );
}

export default function Settings({ onSaved }) {
  const [cfg, setCfg]       = useState({
    serverUrl:         'http://localhost:3001',
    idleThreshold:     300,
    screenshotEnabled: false,
    screenshotInterval:600,
    autoStart:         true,
    minimizeToTray:    true,
  });
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);
  const api = window.worktrack;

  useEffect(() => {
    if (api) api.getSettings().then(s => { setCfg(s); setLoading(false); });
    else setLoading(false);
  }, []);

  function set(key, val) { setCfg(c => ({ ...c, [key]: val })); }

  async function save() {
    if (api) await api.saveSettings(cfg);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSaved?.(); }, 1500);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading…</div>;

  return (
    <div style={s.wrap}>
      {/* Server */}
      <div style={s.section}>
        <div style={s.sTitle}>Server</div>
        <div style={s.rowLast}>
          <div><div style={s.label}>Admin server URL</div><div style={s.sub}>For syncing data to admin dashboard</div></div>
          <input style={s.input} value={cfg.serverUrl} onChange={e => set('serverUrl', e.target.value)} placeholder="http://localhost:3001" />
        </div>
      </div>

      {/* Tracking */}
      <div style={s.section}>
        <div style={s.sTitle}>Tracking</div>
        <div style={s.row}>
          <div><div style={s.label}>Idle threshold</div><div style={s.sub}>Seconds before marking idle</div></div>
          <input style={s.numInput} type="number" min={30} max={3600} value={cfg.idleThreshold}
            onChange={e => set('idleThreshold', parseInt(e.target.value) || 300)} />
        </div>
        <div style={s.row}>
          <div><div style={s.label}>Screenshot capture</div><div style={s.sub}>Periodic screen capture</div></div>
          <Toggle value={cfg.screenshotEnabled} onChange={v => set('screenshotEnabled', v)} />
        </div>
        {cfg.screenshotEnabled && (
          <div style={s.row}>
            <div><div style={s.label}>Screenshot interval (s)</div><div style={s.sub}>Seconds between captures</div></div>
            <input style={s.numInput} type="number" min={60} max={3600} value={cfg.screenshotInterval}
              onChange={e => set('screenshotInterval', parseInt(e.target.value) || 600)} />
          </div>
        )}
        <div style={s.rowLast}>
          <div><div style={s.label}>Auto-start with Windows</div><div style={s.sub}>Launch on login</div></div>
          <Toggle value={cfg.autoStart} onChange={v => set('autoStart', v)} />
        </div>
      </div>

      {/* App behaviour */}
      <div style={s.section}>
        <div style={s.sTitle}>App behaviour</div>
        <div style={s.rowLast}>
          <div><div style={s.label}>Minimize to tray</div><div style={s.sub}>Keep running when window is closed</div></div>
          <Toggle value={cfg.minimizeToTray} onChange={v => set('minimizeToTray', v)} />
        </div>
      </div>

      <button style={s.saveBtn} onClick={save}>Save settings</button>
      {saved && <div style={s.saved}>✓ Settings saved</div>}
    </div>
  );
}
