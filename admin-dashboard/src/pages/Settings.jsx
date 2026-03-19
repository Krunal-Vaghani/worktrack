/**
 * Web Settings — identical to AdminShell Settings tab in EXE.
 * Saves to server DB → EXE clients fetch on next sync.
 */
import React, { useState, useEffect } from 'react';
import api from '../hooks/useApi.js';

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:42, height:24, borderRadius:12, background:value?'#2563EB':'#D1D5DB', position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, left:value?21:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
    </div>
  );
}

export default function Settings() {
  const [cfg,     setCfg]     = useState({ idleThreshold:300, screenshotEnabled:false, screenshotInterval:600 });
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);
  const [copied,  setCopied]  = useState('');
  const [serverInfo, setServerInfo] = useState({ serverUrl:'', syncToken:'' });

  useEffect(() => {
    api.get('/settings').then(s => {
      if (s.idleThreshold)     setCfg(c=>({...c, idleThreshold:s.idleThreshold}));
      if (s.screenshotEnabled !== undefined) setCfg(c=>({...c, screenshotEnabled:s.screenshotEnabled}));
      if (s.screenshotInterval) setCfg(c=>({...c, screenshotInterval:s.screenshotInterval}));
      setServerInfo({ serverUrl: s.serverUrl || window.location.origin, syncToken: s.syncToken || 'mycompany-sync-2025' });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function save() {
    await api.post('/settings', cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function copy(text, key) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading…</div>;

  return (
    <div style={{ padding:24, maxWidth:760 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, color:'#111827' }}>Settings</h1>
          <p style={{ fontSize:13, color:'#6B7280', marginTop:2 }}>Changes save to server and sync to all employee apps within 30 seconds</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {saved && <span style={{ color:'#16A34A', fontSize:13, fontWeight:500 }}>✓ Saved & pushed</span>}
          <button onClick={save} style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'#2563EB', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' }}>
            Save changes
          </button>
        </div>
      </div>

      {/* Employee connection info */}
      <Section title="Employee connection info" sub="Share with employees to set up their WorkTrack app">
        <InfoRow label="Server URL" sub="Employees enter this in their Settings tab">
          <CopyField value={serverInfo.serverUrl} onCopy={()=>copy(serverInfo.serverUrl,'url')} copied={copied==='url'}/>
        </InfoRow>
        <InfoRow label="Sync token" sub="Must match SYNC_SECRET on server">
          <CopyField value={serverInfo.syncToken} onCopy={()=>copy(serverInfo.syncToken,'token')} copied={copied==='token'}/>
        </InfoRow>
      </Section>

      {/* Tracking */}
      <Section title="Tracking" sub="Applied to all employees — syncs automatically">
        <EditRow label="Idle threshold (seconds)" sub="Mark idle after this many seconds of no keyboard/mouse">
          <input type="number" min={30} max={3600} value={cfg.idleThreshold}
            onChange={e=>setCfg(c=>({...c,idleThreshold:parseInt(e.target.value)||300}))} style={NUM}/>
        </EditRow>
        <EditRow label="Screenshot capture" sub="Periodically capture employee screens">
          <Toggle value={cfg.screenshotEnabled} onChange={v=>setCfg(c=>({...c,screenshotEnabled:v}))}/>
        </EditRow>
        {cfg.screenshotEnabled&&(
          <EditRow label="Screenshot interval (seconds)" sub="How often to take screenshots">
            <input type="number" min={60} max={3600} value={cfg.screenshotInterval}
              onChange={e=>setCfg(c=>({...c,screenshotInterval:parseInt(e.target.value)||600}))} style={NUM}/>
          </EditRow>
        )}
      </Section>

      {/* How it works */}
      <Section title="How employee sync works">
        <div style={{ padding:'14px 20px', fontSize:13, color:'#374151', lineHeight:1.9 }}>
          <ol style={{ paddingLeft:18, margin:0 }}>
            <li>You change a setting here and click <strong>Save changes</strong></li>
            <li>Setting is stored in the server database</li>
            <li>Employee apps fetch it within <strong>30 seconds</strong> on their next sync</li>
            <li>No manual action needed on employee PCs</li>
          </ol>
        </div>
      </Section>
    </div>
  );
}

function CopyField({ value, onCopy, copied }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <code style={{ background:'#F3F4F6', padding:'5px 10px', borderRadius:6, fontSize:12, fontFamily:'monospace', maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>{value||'—'}</code>
      <button onClick={onCopy} style={{ padding:'5px 12px', border:'1px solid #E5E7EB', borderRadius:6, background:'#fff', fontSize:12, cursor:'pointer', whiteSpace:'nowrap', color:'#374151' }}>
        {copied?'✓ Copied':'Copy'}
      </button>
    </div>
  );
}

function Section({ title, sub, children }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6' }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'.04em' }}>{title}</div>
        {sub&&<div style={{ fontSize:12, color:'#9CA3AF', marginTop:3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}
function InfoRow({ label, sub, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid #F9FAFB', gap:16 }}>
      <div><div style={{ fontSize:14, fontWeight:500 }}>{label}</div>{sub&&<div style={{ fontSize:12, color:'#9CA3AF', marginTop:3 }}>{sub}</div>}</div>
      {children}
    </div>
  );
}
function EditRow({ label, sub, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid #F9FAFB', gap:16 }}>
      <div><div style={{ fontSize:14, fontWeight:500 }}>{label}</div>{sub&&<div style={{ fontSize:12, color:'#9CA3AF', marginTop:3 }}>{sub}</div>}</div>
      {children}
    </div>
  );
}
const NUM = { padding:'8px 10px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, fontFamily:'inherit', width:90, textAlign:'right', outline:'none' };
