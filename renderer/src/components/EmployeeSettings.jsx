/**
 * Employee Settings — shown to regular employees.
 * - Server URL and sync token are HIDDEN (pre-configured, not editable)
 * - Idle threshold is NOT shown (admin-only setting)
 * - Only shows: auto-start, minimize to tray, sync status
 */
import React, { useState, useEffect } from 'react';

const SERVER_URL  = 'https://worktrack-production-599c.up.railway.app';
const SYNC_TOKEN  = 'mycompany-sync-2025';

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:38, height:22, borderRadius:11, background:value?'#2563EB':'#D1D5DB', position:'relative', cursor:'pointer', transition:'background .2s' }}>
      <div style={{ position:'absolute', top:2, left:value?18:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
    </div>
  );
}

export default function EmployeeSettings() {
  const [cfg,     setCfg]     = useState({ autoStart:true, minimizeToTray:true });
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);
  const [syncOk,  setSyncOk]  = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const api = window.worktrack;

  useEffect(() => {
    // Load current settings and force server URL + token to correct values
    api?.getSettings().then(s => {
      setCfg({ autoStart: s?.autoStart ?? true, minimizeToTray: s?.minimizeToTray ?? true });
      setLoading(false);
    });
    // Also ensure server URL and sync token are always set correctly
    api?.saveSettings({ serverUrl: SERVER_URL, syncToken: SYNC_TOKEN });
    // Show current sync status
    api?.getSyncStatus?.().then(setSyncStatus);
  }, []);

  const save = async () => {
    await api?.saveSettings({ ...cfg, serverUrl: SERVER_URL, syncToken: SYNC_TOKEN });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testSync = async () => {
    setSyncOk(null);
    const result = await api?.triggerSync?.();
    setSyncOk(result?.success ?? false);
    api?.getSyncStatus?.().then(setSyncStatus);
    setTimeout(() => setSyncOk(null), 8000);
  };

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading…</div>;

  return (
    <div style={{ padding:14, display:'flex', flexDirection:'column', gap:14 }}>

      {/* Server connection status */}
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden' }}>
        <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', color:'#9CA3AF', padding:'10px 14px 0' }}>Server connection</div>
        <Row label="Server" sub={SERVER_URL}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: syncStatus?.isConnected ? '#16A34A' : '#FCA5A5' }}/>
            <span style={{ fontSize:12, color: syncStatus?.isConnected ? '#16A34A' : '#6B7280' }}>
              {syncStatus?.isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </Row>
        <Row label="Last sync" sub="Data syncs automatically every 60 seconds">
          <span style={{ fontSize:12, color:'#6B7280' }}>
            {syncStatus?.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString() : 'Not yet'}
          </span>
        </Row>
        <Row label="Pending records" sub="Records waiting to sync">
          <span style={{ fontSize:12, fontWeight:500, color: (syncStatus?.pendingCount||0)>0 ? '#D97706' : '#16A34A' }}>
            {syncStatus?.pendingCount || 0}
          </span>
        </Row>
        <div style={{ padding:'12px 14px', borderBottom:'1px solid #F3F4F6' }}>
          <button onClick={testSync} style={{ padding:'7px 16px', border:'1px solid #E5E7EB', borderRadius:7, background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' }}>
            Sync now
          </button>
          {syncOk === true  && <span style={{ color:'#16A34A', fontSize:12, marginLeft:10 }}>✓ Synced successfully</span>}
          {syncOk === false && <span style={{ color:'#DC2626', fontSize:12, marginLeft:10 }}>✗ Sync failed — check your internet connection</span>}
        </div>
      </div>

      {/* App behaviour */}
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden' }}>
        <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', color:'#9CA3AF', padding:'10px 14px 0' }}>App behaviour</div>
        <Row label="Auto-start with Windows" sub="Launch WorkTrack automatically on login">
          <Toggle value={cfg.autoStart} onChange={v => setCfg(c => ({ ...c, autoStart:v }))} />
        </Row>
        <Row label="Minimize to tray" sub="Keep running in system tray when window is closed">
          <Toggle value={cfg.minimizeToTray} onChange={v => setCfg(c => ({ ...c, minimizeToTray:v }))} />
        </Row>
      </div>

      <button onClick={save} style={{ width:'100%', padding:12, background:'#2563EB', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
        Save settings
      </button>
      {saved && <div style={{ textAlign:'center', color:'#16A34A', fontSize:13, fontWeight:500 }}>✓ Saved</div>}
    </div>
  );
}

function Row({ label, sub, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'1px solid #F3F4F6' }}>
      <div>
        <div style={{ fontSize:13, fontWeight:500 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'#6B7280', marginTop:2, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}
