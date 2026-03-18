// Employee settings — no screenshot toggle (admin only), includes sync config
import React, { useState, useEffect } from 'react';

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:38, height:22, borderRadius:11, background:value?'#2563EB':'#D1D5DB', position:'relative', cursor:'pointer', transition:'background .2s' }}>
      <div style={{ position:'absolute', top:2, left:value?18:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
    </div>
  );
}

export default function EmployeeSettings() {
  const [cfg,     setCfg]     = useState({ idleThreshold:300, autoStart:true, minimizeToTray:true, serverUrl:'', syncToken:'' });
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);
  const [syncOk,  setSyncOk]  = useState(null);
  const api = window.worktrack;

  useEffect(() => {
    api?.getSettings().then(s => { if (s) setCfg(prev => ({ ...prev, ...s })); setLoading(false); });
  }, []);

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  const save = async () => {
    await api?.saveSettings(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testSync = async () => {
    setSyncOk(null);
    const result = await api?.triggerSync?.();
    setSyncOk(result?.success ?? false);
    setTimeout(() => setSyncOk(null), 5000);
  };

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading…</div>;

  return (
    <div style={{ padding:14, display:'flex', flexDirection:'column', gap:14 }}>

      <Section title="Server sync">
        <Row label="Admin server URL" sub="e.g. http://192.168.1.100:3001 or https://yourserver.com">
          <input value={cfg.serverUrl} onChange={e => set('serverUrl', e.target.value)}
            placeholder="http://localhost:3001"
            style={{ ...INP, width:220, textAlign:'left' }} spellCheck="false" />
        </Row>
        <Row label="Sync token" sub="Must match SYNC_SECRET on the server">
          <input value={cfg.syncToken} onChange={e => set('syncToken', e.target.value)}
            placeholder="worktrack-sync-secret"
            style={{ ...INP, width:180, textAlign:'left' }} spellCheck="false" />
        </Row>
        <Row label="Test connection" sub="Check server is reachable">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={testSync} style={{ padding:'6px 14px', border:'1px solid #E5E7EB', borderRadius:6, background:'#fff', fontSize:12, cursor:'pointer', color:'#374151' }}>
              Test now
            </button>
            {syncOk === true  && <span style={{ color:'#16A34A', fontSize:12 }}>✓ Connected</span>}
            {syncOk === false && <span style={{ color:'#DC2626', fontSize:12 }}>✗ Failed — check URL and token</span>}
          </div>
        </Row>
      </Section>

      <Section title="Tracking">
        <Row label="Idle threshold (s)" sub="Mark idle after this many seconds of no input">
          <input type="number" min={30} max={3600} value={cfg.idleThreshold}
            onChange={e => set('idleThreshold', parseInt(e.target.value) || 300)} style={INP} />
        </Row>
      </Section>

      <Section title="App behaviour">
        <Row label="Auto-start with Windows" sub="Launch WorkTrack on login">
          <Toggle value={cfg.autoStart} onChange={v => set('autoStart', v)} />
        </Row>
        <Row label="Minimize to tray" sub="Keep running when window is closed">
          <Toggle value={cfg.minimizeToTray} onChange={v => set('minimizeToTray', v)} />
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
      <div>
        <div style={{ fontSize:13, fontWeight:500 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}
const INP = { padding:'6px 10px', border:'1px solid #E5E7EB', borderRadius:6, fontSize:13, fontFamily:'inherit', width:80, textAlign:'right', outline:'none' };
