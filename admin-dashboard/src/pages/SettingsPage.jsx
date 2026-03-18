import React, { useState } from 'react';

function Section({ title, children }) {
  return (
    <div style={S.section}>
      <h3 style={S.sectionTitle}>{title}</h3>
      <div style={S.sectionBody}>{children}</div>
    </div>
  );
}

function Field({ label, desc, children }) {
  return (
    <div style={S.field}>
      <div>
        <p style={S.fieldLabel}>{label}</p>
        {desc && <p style={S.fieldDesc}>{desc}</p>}
      </div>
      <div style={S.fieldControl}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{ width:42, height:24, borderRadius:12, background: value ? '#2563EB' : '#D1D5DB',
               position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}
    >
      <div style={{
        position:'absolute', top:3, left: value ? 21 : 3, width:18, height:18,
        borderRadius:'50%', background:'#fff', transition:'left .2s',
        boxShadow:'0 1px 3px rgba(0,0,0,.2)'
      }} />
    </div>
  );
}

const APP_CATEGORIES = [
  { app:'YouTube',   category:'non-work' },
  { app:'Reddit',    category:'non-work' },
  { app:'Slack',     category:'work'     },
  { app:'VS Code',   category:'work'     },
  { app:'Notion',    category:'work'     },
  { app:'Spotify',   category:'non-work' },
  { app:'Chrome',    category:'neutral'  },
  { app:'Explorer',  category:'neutral'  },
];

export default function SettingsPage() {
  const [idleThreshold,  setIdleThreshold]  = useState(300);
  const [workStart,      setWorkStart]      = useState('09:00');
  const [workEnd,        setWorkEnd]        = useState('18:00');
  const [screenshotOn,   setScreenshotOn]   = useState(false);
  const [screenshotFreq, setScreenshotFreq] = useState(600);
  const [appRules,       setAppRules]       = useState(APP_CATEGORIES);
  const [saved,          setSaved]          = useState(false);
  const [newApp,         setNewApp]         = useState('');
  const [newCat,         setNewCat]         = useState('work');

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // In production: api.post('/settings', { idleThreshold, workStart, workEnd, screenshotOn, screenshotFreq, appRules })
  }

  function updateRule(i, category) {
    setAppRules(r => r.map((rule, idx) => idx === i ? { ...rule, category } : rule));
  }

  function addRule() {
    if (!newApp.trim()) return;
    setAppRules(r => [...r, { app: newApp.trim(), category: newCat }]);
    setNewApp('');
  }

  function removeRule(i) {
    setAppRules(r => r.filter((_, idx) => idx !== i));
  }

  const catColors = { work:'#EFF6FF', neutral:'#F9FAFB', 'non-work':'#FEF2F2' };
  const catText   = { work:'#2563EB', neutral:'#6B7280', 'non-work':'#DC2626' };

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.h1}>Settings</h1>
          <p style={S.sub}>Configure tracking rules, working hours, and categories</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {saved && <span style={S.savedBadge}>✓ Saved</span>}
          <button style={S.saveBtn} onClick={save}>Save changes</button>
        </div>
      </div>

      <Section title="Tracking">
        <Field label="Idle threshold (seconds)" desc="Mark employee as idle after this many seconds of no input">
          <input style={S.numInput} type="number" min={30} max={3600} value={idleThreshold}
            onChange={e => setIdleThreshold(parseInt(e.target.value) || 300)} />
        </Field>
        <Field label="Working hours" desc="Define the standard workday window for reporting">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input style={{ ...S.numInput, width:90 }} type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} />
            <span style={{ color:'#9CA3AF', fontSize:13 }}>to</span>
            <input style={{ ...S.numInput, width:90 }} type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} />
          </div>
        </Field>
      </Section>

      <Section title="Screenshots">
        <Field label="Enable screenshot capture" desc="Periodically capture employee screens (requires client restart)">
          <Toggle value={screenshotOn} onChange={setScreenshotOn} />
        </Field>
        {screenshotOn && (
          <Field label="Capture interval (seconds)" desc="How often to take a screenshot when a task is active">
            <input style={S.numInput} type="number" min={60} max={3600} value={screenshotFreq}
              onChange={e => setScreenshotFreq(parseInt(e.target.value) || 600)} />
          </Field>
        )}
      </Section>

      <Section title="Application categories">
        <p style={{ fontSize:13, color:'#6B7280', marginBottom:16 }}>
          Classify applications to accurately calculate productive vs non-productive time.
        </p>

        {/* Existing rules */}
        <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:16 }}>
          {appRules.map((rule, i) => (
            <div key={i} style={S.ruleRow}>
              <span style={S.ruleApp}>{rule.app}</span>
              <select
                style={{ ...S.ruleSelect, background: catColors[rule.category], color: catText[rule.category] }}
                value={rule.category}
                onChange={e => updateRule(i, e.target.value)}
              >
                <option value="work">Work</option>
                <option value="neutral">Neutral</option>
                <option value="non-work">Non-work</option>
              </select>
              <button style={S.removeBtn} onClick={() => removeRule(i)}>✕</button>
            </div>
          ))}
        </div>

        {/* Add new rule */}
        <div style={S.addRow}>
          <input
            style={{ ...S.numInput, flex:1 }}
            placeholder="App name (e.g. Netflix)"
            value={newApp}
            onChange={e => setNewApp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRule()}
          />
          <select style={S.ruleSelect} value={newCat} onChange={e => setNewCat(e.target.value)}>
            <option value="work">Work</option>
            <option value="neutral">Neutral</option>
            <option value="non-work">Non-work</option>
          </select>
          <button style={S.addBtn} onClick={addRule}>Add rule</button>
        </div>
      </Section>

      <Section title="Admin account">
        <Field label="Change password" desc="Update the admin dashboard password">
          <button style={S.outlineBtn} onClick={() => alert('In production: open change password dialog')}>
            Change password
          </button>
        </Field>
        <Field label="Setup token" desc="Share with employees to auto-register their client">
          <div style={{ display:'flex', gap:8 }}>
            <input style={{ ...S.numInput, width:200, fontFamily:'monospace', fontSize:13 }}
              value="wt_setup_xK9mP2..." readOnly />
            <button style={S.outlineBtn} onClick={() => navigator.clipboard?.writeText('wt_setup_xK9mP2...')}>
              Copy
            </button>
          </div>
        </Field>
      </Section>
    </div>
  );
}

const S = {
  page:         { padding:28, maxWidth:900, margin:'0 auto' },
  pageHeader:   { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 },
  h1:           { fontSize:22, fontWeight:600, color:'#111827' },
  sub:          { fontSize:13, color:'#6B7280', marginTop:2 },
  saveBtn:      { padding:'9px 20px', borderRadius:8, border:'none', background:'#2563EB', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' },
  savedBadge:   { fontSize:13, color:'#16A34A', fontWeight:500 },
  section:      { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, overflow:'hidden', marginBottom:16 },
  sectionTitle: { fontSize:13, fontWeight:600, color:'#374151', padding:'14px 20px', borderBottom:'1px solid #F3F4F6', textTransform:'uppercase', letterSpacing:'.04em' },
  sectionBody:  { padding:'4px 0' },
  field:        { display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'14px 20px', borderBottom:'1px solid #F9FAFB' },
  fieldLabel:   { fontSize:14, fontWeight:500, color:'#111827' },
  fieldDesc:    { fontSize:12, color:'#9CA3AF', marginTop:3 },
  fieldControl: { flexShrink:0 },
  numInput:     { padding:'8px 10px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', color:'#111827' },
  ruleRow:      { display:'flex', alignItems:'center', gap:10, padding:'8px 20px', borderBottom:'1px solid #F9FAFB' },
  ruleApp:      { flex:1, fontSize:13, fontWeight:500, color:'#374151' },
  ruleSelect:   { padding:'5px 10px', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' },
  removeBtn:    { border:'none', background:'none', cursor:'pointer', color:'#D1D5DB', fontSize:14, padding:'2px 6px' },
  addRow:       { display:'flex', gap:8, padding:'14px 20px', alignItems:'center' },
  addBtn:       { padding:'8px 16px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:13, cursor:'pointer', fontWeight:500, color:'#374151', whiteSpace:'nowrap' },
  outlineBtn:   { padding:'8px 16px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' },
};
