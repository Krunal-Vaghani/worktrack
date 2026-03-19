/**
 * EmployeeSettings — shows sync status, auto-start, minimize to tray.
 * No server URL / sync token (pre-configured and hidden).
 * No idle threshold (admin-only via server settings).
 */
import React, { useState, useEffect } from 'react';

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:38, height:22, borderRadius:11, background:value?'#2563EB':'#D1D5DB', position:'relative', cursor:'pointer', transition:'background .2s' }}>
      <div style={{ position:'absolute', top:2, left:value?18:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
    </div>
  );
}

export default function EmployeeSettings({ onSyncPoll }) {
  const [cfg,     setCfg]     = useState({ autoStart:true, minimizeToTray:true });
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);
  const [sync,    setSync]    = useState(null);
  const [syncing, setSyncing] = useState(false);
  const api = window.worktrack;

  useEffect(() => {
    const load = () => api?.getSettings().then(s => {
      setCfg({ autoStart:s?.autoStart??true, minimizeToTray:s?.minimizeToTray??true });
      setLoading(false);
    });
    load();
    api?.getSyncStatus?.().then(setSync);
    // Re-load when server pushes settings update
    const unsub = api?.onSettingsChanged?.(() => load());
    return () => unsub?.();
  }, []);

  const save = async () => {
    await api?.saveSettings(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const syncNow = async () => {
    setSyncing(true);
    const res = await api?.triggerSync?.();
    const status = await api?.getSyncStatus?.();
    setSync(status);
    onSyncPoll?.();
    setSyncing(false);
  };

  const lastSyncAgo = sync?.lastSync ? (() => {
    const s = Math.floor((Date.now() - new Date(sync.lastSync)) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return `${Math.floor(s/3600)}h ago`;
  })() : 'Never';

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading…</div>;

  return (
    <div style={{ padding:14, display:'flex', flexDirection:'column', gap:14 }}>

      {/* Live sync status card */}
      <div style={{ background: sync?.isConnected ? '#F0FDF4' : '#FEF2F2', border:`1px solid ${sync?.isConnected?'#BBF7D0':'#FECACA'}`, borderRadius:12, padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <div style={{ width:12, height:12, borderRadius:'50%', background:sync?.isConnected?'#22C55E':'#EF4444', boxShadow:sync?.isConnected?'0 0 8px #22C55E':'none' }}/>
          <span style={{ fontSize:15, fontWeight:600, color:sync?.isConnected?'#166534':'#991B1B' }}>
            {sync?.isConnected ? 'Connected to server' : 'Offline — no server connection'}
          </span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          <div style={{ background:'rgba(255,255,255,.7)', borderRadius:8, padding:'10px 12px' }}>
            <div style={{ fontSize:11, color:'#6B7280', marginBottom:2 }}>Last sync</div>
            <div style={{ fontSize:14, fontWeight:600 }}>{lastSyncAgo}</div>
          </div>
          <div style={{ background:'rgba(255,255,255,.7)', borderRadius:8, padding:'10px 12px' }}>
            <div style={{ fontSize:11, color:'#6B7280', marginBottom:2 }}>Pending records</div>
            <div style={{ fontSize:14, fontWeight:600, color:(sync?.pendingCount||0)>0?'#D97706':'#16A34A' }}>{sync?.pendingCount||0}</div>
          </div>
        </div>
        <button onClick={syncNow} disabled={syncing} style={{ width:'100%', padding:'8px 0', border:'none', borderRadius:7, background:sync?.isConnected?'#16A34A':'#6B7280', color:'#fff', fontSize:13, fontWeight:500, cursor:syncing?'not-allowed':'pointer', opacity:syncing?.7:1 }}>
          {syncing ? 'Syncing…' : '↑ Sync now'}
        </button>
      </div>

      {/* App behaviour */}
      <Section title="App behaviour">
        <Row label="Auto-start with Windows" sub="Launch WorkTrack automatically on login">
          <Toggle value={cfg.autoStart} onChange={v => setCfg(c=>({...c,autoStart:v}))} />
        </Row>
        <Row label="Minimize to tray" sub="Keep running in system tray when closed">
          <Toggle value={cfg.minimizeToTray} onChange={v => setCfg(c=>({...c,minimizeToTray:v}))} />
        </Row>
      </Section>

      <button onClick={save} style={{ width:'100%', padding:12, background:'#2563EB', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
        Save settings
      </button>
      {saved && <div style={{ textAlign:'center', color:'#16A34A', fontSize:13, fontWeight:500 }}>✓ Saved</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden' }}>
      <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', color:'#9CA3AF', padding:'10px 14px 0' }}>{title}</div>
      {children}
    </div>
  );
}
function Row({ label, sub, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'1px solid #F3F4F6' }}>
      <div><div style={{ fontSize:13, fontWeight:500 }}>{label}</div>{sub&&<div style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>{sub}</div>}</div>
      {children}
    </div>
  );
}
