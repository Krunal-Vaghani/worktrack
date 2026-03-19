/**
 * AdminShell (Electron) — identical tabs to web dashboard:
 * History | Today | Employees | Settings
 * Same data, same API, same settings saved to server.
 */
import React, { useState, useEffect, useCallback } from 'react';

const fmtDur  = s => { s=Math.max(0,Math.floor(s||0)); if(!s)return'—'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; };
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—';
const ScoreChip = ({score}) => { if(score==null)return null; const s=Math.round(score); const c=s>=80?'#16A34A':s>=60?'#D97706':'#DC2626'; const bg=s>=80?'#F0FDF4':s>=60?'#FFFBEB':'#FEF2F2'; return <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:bg,color:c}}>{s}%</span>; };

const TABS = [
  { id:'history',   label:'History',   icon:'📋' },
  { id:'today',     label:'Today',     icon:'📊' },
  { id:'employees', label:'Employees', icon:'👥' },
  { id:'settings',  label:'Settings',  icon:'⚙️' },
];

function ConnIndicator({ sync }) {
  const connected = sync?.isConnected;
  const dot   = connected ? '#22C55E' : '#EF4444';
  const label = connected ? 'Live' : 'Offline';
  const color = connected ? '#86EFAC' : '#FCA5A5';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, background:'rgba(255,255,255,.1)' }}>
      <div style={{ width:7, height:7, borderRadius:'50%', background:dot, boxShadow:connected?`0 0 6px ${dot}`:'none' }}/>
      <span style={{ fontSize:11, fontWeight:600, color }}>{label}</span>
    </div>
  );
}

export default function AdminShell({ user, onLogout }) {
  const [tab,  setTab]  = useState('history');
  const [sync, setSync] = useState({ isConnected:false });
  const api = window.worktrack;

  useEffect(() => {
    const poll = () => api?.getSyncStatus?.().then(setSync).catch(()=>{});
    poll();
    const iv = setInterval(poll, 15000);
    return () => clearInterval(iv);
  }, [api]);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      {/* Titlebar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', height:46, background:'#1D4ED8', flexShrink:0, WebkitAppRegion:'drag' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>WT</div>
          <span style={{ color:'#fff', fontWeight:600, fontSize:13 }}>WorkTrack</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', background:'rgba(255,255,255,.1)', padding:'1px 7px', borderRadius:4 }}>Admin</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, WebkitAppRegion:'no-drag' }}>
          <ConnIndicator sync={sync} />
          <span style={{ color:'rgba(255,255,255,.8)', fontSize:12 }}>{user.name}</span>
          <button onClick={onLogout} style={{ padding:'3px 9px', borderRadius:5, border:'1px solid rgba(255,255,255,.3)', background:'transparent', color:'rgba(255,255,255,.8)', fontSize:11, cursor:'pointer' }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'hidden', background:'#F9FAFB' }}>
        <div style={{ display:tab==='history'  ?'block':'none', height:'100%', overflowY:'auto' }}><AdminHistory /></div>
        <div style={{ display:tab==='today'    ?'block':'none', height:'100%', overflowY:'auto' }}><AdminToday /></div>
        <div style={{ display:tab==='employees'?'block':'none', height:'100%', overflowY:'auto' }}><AdminEmployees /></div>
        <div style={{ display:tab==='settings' ?'block':'none', height:'100%', overflowY:'auto' }}><AdminSettings /></div>
      </div>

      {/* Bottom nav */}
      <nav style={{ display:'flex', borderTop:'1px solid #E5E7EB', background:'#fff', flexShrink:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:'8px 0', border:'none', background:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, color:tab===t.id?'#2563EB':'#6B7280', borderTop:tab===t.id?'2px solid #2563EB':'2px solid transparent' }}>
            <span style={{ fontSize:17 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight:tab===t.id?600:400 }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ── HISTORY ──────────────────────────────────────────────────────────────── */
function AdminHistory() {
  const [employees, setEmployees] = useState([]);
  const [selEmp,    setSelEmp]    = useState('all');
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [exp,       setExp]       = useState(null);
  const [actMap,    setActMap]    = useState({});
  const api = window.worktrack;

  useEffect(() => { api?.adminGetAllEmployees().then(e=>setEmployees(e||[])).catch(()=>{}); }, []);

  useEffect(() => {
    setLoading(true); setExp(null);
    const run = async () => {
      try {
        const data = selEmp==='all' ? await api?.adminGetAllTasks(date) : await api?.adminGetEmployeeTasks(selEmp, date);
        setTasks(Array.isArray(data)?data.filter(t=>t.end_time):[]);
      } catch { setTasks([]); }
      setLoading(false);
    };
    run();
  }, [selEmp, date]);

  async function expand(taskId) {
    if (exp===taskId){setExp(null);return;}
    setExp(taskId);
    if (!actMap[taskId]&&api) {
      try{const a=await api.getActivity(taskId);setActMap(m=>({...m,[taskId]:a||[]}));}
      catch{setActMap(m=>({...m,[taskId]:[]}))}
    }
  }

  return (
    <div style={{padding:16}}>
      <div style={{fontSize:16,fontWeight:600,marginBottom:12}}>Task History</div>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={SEL}>
          <option value="all">All employees</option>
          {employees.map(e=><option key={e.user_id} value={e.user_id}>{e.name}</option>)}
        </select>
        <input type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={e=>setDate(e.target.value)} style={SEL}/>
        <span style={{fontSize:12,color:'#9CA3AF',alignSelf:'center'}}>{tasks.length} tasks</span>
      </div>
      {loading&&<div style={{color:'#9CA3AF',fontSize:13}}>Loading…</div>}
      {!loading&&tasks.length===0&&<div style={{color:'#9CA3AF',fontSize:13}}>No completed tasks.</div>}
      {tasks.map(task=>(
        <div key={task.task_id} style={{border:'1px solid #E5E7EB',borderRadius:10,marginBottom:8,background:'#fff',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 13px',cursor:'pointer'}} onClick={()=>expand(task.task_id)}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{task.task_name}</div>
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>
                {task.user_name&&<span style={{fontWeight:500,color:'#6B7280',marginRight:6}}>{task.user_name}</span>}
                {fmtTime(task.start_time)} → {fmtTime(task.end_time)} · {fmtDur(task.total_duration)}
              </div>
            </div>
            <ScoreChip score={task.productivity_score}/>
            <span style={{fontSize:11,color:'#9CA3AF'}}>{exp===task.task_id?'▲':'▼'}</span>
          </div>
          {exp===task.task_id&&(
            <div style={{borderTop:'1px solid #F3F4F6',padding:'11px 13px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                {[{l:'Total',v:fmtDur(task.total_duration),c:'#374151'},{l:'Active',v:fmtDur(task.active_duration),c:'#16A34A'},{l:'Idle',v:fmtDur(task.idle_duration),c:'#D97706'}].map(x=>(
                  <div key={x.l} style={{background:'#F9FAFB',borderRadius:6,padding:'8px',textAlign:'center'}}>
                    <div style={{fontSize:10,color:'#9CA3AF',textTransform:'uppercase'}}>{x.l}</div>
                    <div style={{fontSize:14,fontWeight:600,color:x.c,marginTop:2}}>{x.v}</div>
                  </div>
                ))}
              </div>
              {actMap[task.task_id]===undefined?<div style={{fontSize:12,color:'#9CA3AF'}}>Loading…</div>:
               actMap[task.task_id].length===0?<div style={{fontSize:12,color:'#9CA3AF'}}>No activity.</div>:(
                <div style={{maxHeight:140,overflowY:'auto'}}>
                  {actMap[task.task_id].map((a,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0',borderBottom:'1px solid #F9FAFB',fontSize:12}}>
                      <span style={{color:'#9CA3AF',minWidth:44,fontSize:11}}>{fmtTime(a.timestamp)}</span>
                      <div style={{width:6,height:6,borderRadius:'50%',flexShrink:0,background:a.idle_flag?'#F59E0B':'#6B7280'}}/>
                      <span style={{flex:1,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.application_name}</span>
                      <span style={{color:'#9CA3AF',fontSize:11}}>{fmtDur(a.duration)}</span>
                    </div>
                  ))}
                </div>
               )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── TODAY ────────────────────────────────────────────────────────────────── */
function AdminToday() {
  const [employees, setEmployees] = useState([]);
  const [selEmp,    setSelEmp]    = useState('all');
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const api = window.worktrack;
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { api?.adminGetAllEmployees().then(e=>setEmployees(e||[])).catch(()=>{}); }, []);

  useEffect(() => {
    setLoading(true);
    const run = async () => {
      try {
        const data = selEmp==='all' ? await api?.adminGetAllTasks(today) : await api?.adminGetEmployeeTasks(selEmp, today);
        setTasks((Array.isArray(data)?data:[]).filter(t=>t.end_time));
      } catch { setTasks([]); }
      setLoading(false);
    };
    run();
    const iv = setInterval(run, 30000);
    return () => clearInterval(iv);
  }, [selEmp]);

  const totalActive = tasks.reduce((s,t)=>s+(t.active_duration||0),0);
  const totalIdle   = tasks.reduce((s,t)=>s+(t.idle_duration||0),0);
  const avgScore    = tasks.length ? Math.round(tasks.reduce((s,t)=>s+(t.productivity_score||0),0)/tasks.length) : 0;

  return (
    <div style={{padding:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:600}}>Today</div>
        <select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={SEL}>
          <option value="all">All employees</option>
          {employees.map(e=><option key={e.user_id} value={e.user_id}>{e.name}</option>)}
        </select>
      </div>
      {tasks.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
          {[{l:'Tasks',v:tasks.length,c:'#111827'},{l:'Avg score',v:`${avgScore}%`,c:avgScore>=80?'#16A34A':avgScore>=60?'#D97706':'#DC2626'},{l:'Active',v:fmtDur(totalActive),c:'#2563EB'},{l:'Idle',v:fmtDur(totalIdle),c:'#D97706'}].map(x=>(
            <div key={x.l} style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:8,padding:'10px 12px'}}>
              <div style={{fontSize:11,color:'#6B7280',marginBottom:3}}>{x.l}</div>
              <div style={{fontSize:18,fontWeight:600,color:x.c}}>{x.v}</div>
            </div>
          ))}
        </div>
      )}
      {loading&&<div style={{color:'#9CA3AF',fontSize:13}}>Loading…</div>}
      {!loading&&tasks.length===0&&<div style={{color:'#9CA3AF',fontSize:13,padding:'20px 0'}}>No completed tasks today.</div>}
      {tasks.map((t,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid #F3F4F6',fontSize:13}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.task_name}</div>
            <div style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>{t.user_name||''} · {fmtTime(t.start_time)}–{fmtTime(t.end_time)} · {fmtDur(t.total_duration)}</div>
          </div>
          <ScoreChip score={t.productivity_score}/>
        </div>
      ))}
    </div>
  );
}

/* ── EMPLOYEES ────────────────────────────────────────────────────────────── */
function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [creating,  setCreating]  = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newRole,   setNewRole]   = useState('employee');
  const [createErr, setCreateErr] = useState('');
  const [created,   setCreated]   = useState(null);
  const [editing,   setEditing]   = useState(null);
  const [resetMsg,  setResetMsg]  = useState('');
  const api = window.worktrack;

  const load = useCallback(() => {
    api?.adminGetAllEmployees().then(e=>{setEmployees(e||[]);setLoading(false);}).catch(()=>setLoading(false));
  }, [api]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    const name = newName.trim();
    if (!name) { setCreateErr('Name required'); return; }
    if (/\s/.test(name)) { setCreateErr('No spaces — use e.g. JaneSmith'); return; }
    const res = await api?.adminCreateEmployee(name, newRole);
    if (res?.success) { setCreated(res.employee); setNewName(''); setCreating(false); load(); }
    else setCreateErr(res?.error || 'Failed');
  }

  async function saveEdit() {
    if (!editing) return;
    await api?.adminUpdateEmployee(editing.userId, editing.name, editing.role, editing.password||undefined);
    setEditing(null); load();
  }

  async function resetPw(emp) {
    const res = await api?.adminResetPassword(emp.user_id);
    if (res?.success) { setResetMsg(`${emp.name}: ${res.newPassword}`); setTimeout(()=>setResetMsg(''),20000); }
  }

  async function toggleAccess(emp) {
    await api?.adminToggleAccess(emp.user_id, !(emp.disabled==1));
    load();
  }

  async function del(emp) {
    if (!confirm(`Delete ${emp.name}?`)) return;
    await api?.adminDeleteEmployee(emp.user_id);
    load();
  }

  return (
    <div style={{padding:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:600}}>Employees ({employees.length})</div>
        <button onClick={()=>setCreating(true)} style={{padding:'7px 14px',background:'#2563EB',color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:500,cursor:'pointer'}}>+ Add</button>
      </div>

      {creating&&(
        <div style={OVERLAY}>
          <div style={MODAL}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Add employee</div>
            <label style={LBL}>Name / User ID <span style={{color:'#9CA3AF',fontWeight:400,fontSize:11}}>(no spaces, case-sensitive)</span></label>
            <input style={INP} value={newName} onChange={e=>{setNewName(e.target.value);setCreateErr('');}} autoFocus placeholder="e.g. JaneSmith" onKeyDown={e=>e.key==='Enter'&&create()}/>
            {createErr&&<div style={{marginTop:6,color:'#DC2626',fontSize:12}}>{createErr}</div>}
            <label style={{...LBL,marginTop:12}}>Role</label>
            <select style={INP} value={newRole} onChange={e=>setNewRole(e.target.value)}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={()=>{setCreating(false);setCreateErr('');}} style={CANCEL_BTN}>Cancel</button>
              <button onClick={create} style={CONFIRM_BTN}>Create</button>
            </div>
          </div>
        </div>
      )}

      {editing&&(
        <div style={OVERLAY}>
          <div style={MODAL}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Edit {editing.name}</div>
            <label style={LBL}>User ID <span style={{color:'#9CA3AF',fontWeight:400,fontSize:11}}>(cannot change)</span></label>
            <input style={{...INP,background:'#F9FAFB',color:'#9CA3AF',cursor:'not-allowed'}} value={editing.name} readOnly/>
            <label style={{...LBL,marginTop:12}}>Role</label>
            <select style={INP} value={editing.role} onChange={e=>setEditing(x=>({...x,role:e.target.value}))}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <label style={{...LBL,marginTop:12}}>New password <span style={{color:'#9CA3AF',fontWeight:400,fontSize:11}}>(blank = keep current)</span></label>
            <input style={INP} type="password" value={editing.password||''} onChange={e=>setEditing(x=>({...x,password:e.target.value}))} placeholder="••••••••"/>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={()=>setEditing(null)} style={CANCEL_BTN}>Cancel</button>
              <button onClick={saveEdit} style={CONFIRM_BTN}>Save</button>
            </div>
          </div>
        </div>
      )}

      {created&&(
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:12,marginBottom:12,fontSize:13}}>
          <div style={{fontWeight:600,color:'#166534',marginBottom:6}}>✓ Created — share credentials:</div>
          <div style={{fontFamily:'monospace',color:'#14532D',lineHeight:2}}>
            <div>ID: <strong>{created.user_id}</strong></div>
            <div>Password: <strong>{created.plainPassword}</strong></div>
          </div>
          <div style={{fontSize:11,color:'#16A34A',marginTop:4}}>Save this — password won't show again.</div>
          <button onClick={()=>setCreated(null)} style={{marginTop:8,padding:'4px 10px',border:'1px solid #16A34A',borderRadius:5,background:'#fff',color:'#16A34A',fontSize:11,cursor:'pointer'}}>Dismiss</button>
        </div>
      )}

      {resetMsg&&(
        <div style={{background:'#FEF3C7',border:'1px solid #FDE68A',borderRadius:8,padding:10,marginBottom:12,fontSize:12,fontFamily:'monospace',color:'#92400E'}}>
          🔑 New password — {resetMsg}
        </div>
      )}

      {loading&&<div style={{color:'#9CA3AF',fontSize:13}}>Loading…</div>}
      {employees.map(emp=>(
        <div key={emp.user_id} style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:12,marginBottom:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:emp.role==='admin'?'#EDE9FE':'#DBEAFE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:emp.role==='admin'?'#6D28D9':'#1D4ED8',flexShrink:0}}>
              {emp.name?.slice(0,2)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600}}>
                {emp.name}
                {emp.disabled==1&&<span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:'#FEF2F2',color:'#DC2626',marginLeft:6}}>Disabled</span>}
              </div>
              <div style={{fontSize:11,color:'#6B7280',fontFamily:'monospace',marginTop:1}}>{emp.role}</div>
            </div>
            <div style={{display:'flex',gap:5,flexShrink:0}}>
              <button onClick={()=>setEditing({userId:emp.user_id,name:emp.name,role:emp.role,password:''})} style={ACT_BTN}>Edit</button>
              <button onClick={()=>resetPw(emp)} style={ACT_BTN}>Reset PW</button>
              <button onClick={()=>toggleAccess(emp)} style={{...ACT_BTN,color:emp.disabled==1?'#16A34A':'#D97706'}}>
                {emp.disabled==1?'Enable':'Disable'}
              </button>
              {emp.user_id!=='admin'&&<button onClick={()=>del(emp)} style={{...ACT_BTN,color:'#DC2626'}}>Del</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── SETTINGS ─────────────────────────────────────────────────────────────── */
function AdminSettings() {
  const [cfg,     setCfg]     = useState({ idleThreshold:300, screenshotEnabled:false, screenshotInterval:600, autoStart:true, minimizeToTray:true });
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);
  const [syncOk,  setSyncOk]  = useState(null);
  const [serverInfo, setServerInfo] = useState({ serverUrl:'', syncToken:'' });
  const api = window.worktrack;

  useEffect(() => {
    const load = () => api?.getSettings().then(s => {
      if(s) { setCfg(prev=>({...prev,...s})); setServerInfo({ serverUrl:s.serverUrl||'', syncToken:s.syncToken||'' }); }
      setLoading(false);
    });
    load();
    // Re-load when server pushes new settings
    const unsub = api?.onSettingsChanged?.(() => load());
    return () => unsub?.();
  }, []);

  const set = (k,v) => setCfg(c=>({...c,[k]:v}));

  async function save() {
    // save-settings IPC already pushes to server internally
    await api?.saveSettings(cfg);
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  }

  const testSync = async () => {
    setSyncOk(null);
    const res = await api?.triggerSync?.();
    setSyncOk(res?.success??false);
    setTimeout(()=>setSyncOk(null),6000);
  };

  function Toggle({value,onChange}){ return <div onClick={()=>onChange(!value)} style={{width:38,height:22,borderRadius:11,background:value?'#2563EB':'#D1D5DB',position:'relative',cursor:'pointer',transition:'background .2s'}}><div style={{position:'absolute',top:2,left:value?18:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/></div>; }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#9CA3AF'}}>Loading…</div>;

  return (
    <div style={{padding:16,display:'flex',flexDirection:'column',gap:12}}>

      {/* Server info */}
      <div style={SECTION}>
        <div style={SEC_TITLE}>Server</div>
        <Row label="URL" sub={serverInfo.serverUrl||'Not set'}><span style={{fontSize:11,color:'#9CA3AF'}}>Auto-configured</span></Row>
        <Row label="Sync token" sub={serverInfo.syncToken||'Not set'}><span style={{fontSize:11,color:'#9CA3AF'}}>Auto-configured</span></Row>
        <Row label="Connection">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={testSync} style={{padding:'5px 12px',border:'1px solid #E5E7EB',borderRadius:6,background:'#fff',fontSize:12,cursor:'pointer'}}>Test now</button>
            {syncOk===true&&<span style={{color:'#16A34A',fontSize:12}}>✓ Connected</span>}
            {syncOk===false&&<span style={{color:'#DC2626',fontSize:12}}>✗ Failed</span>}
          </div>
        </Row>
      </div>

      {/* Tracking — these push to ALL employees via server */}
      <div style={SECTION}>
        <div style={SEC_TITLE}>Tracking (applies to all employees)</div>
        <Row label="Idle threshold (s)" sub="Seconds of no input before marking idle">
          <input type="number" min={30} max={3600} value={cfg.idleThreshold} onChange={e=>set('idleThreshold',parseInt(e.target.value)||300)} style={NUM}/>
        </Row>
        <Row label="Screenshot capture" sub="Periodic screen capture from employees">
          <Toggle value={cfg.screenshotEnabled} onChange={v=>set('screenshotEnabled',v)}/>
        </Row>
        {cfg.screenshotEnabled&&(
          <Row label="Screenshot interval (s)" sub="How often to capture">
            <input type="number" min={60} max={3600} value={cfg.screenshotInterval} onChange={e=>set('screenshotInterval',parseInt(e.target.value)||600)} style={NUM}/>
          </Row>
        )}
      </div>

      {/* App */}
      <div style={SECTION}>
        <div style={SEC_TITLE}>App behaviour</div>
        <Row label="Auto-start with Windows"><Toggle value={cfg.autoStart} onChange={v=>set('autoStart',v)}/></Row>
        <Row label="Minimize to tray"><Toggle value={cfg.minimizeToTray} onChange={v=>set('minimizeToTray',v)}/></Row>
      </div>

      <button onClick={save} style={{width:'100%',padding:12,background:'#2563EB',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer'}}>
        Save &amp; push to all employees
      </button>
      {saved&&<div style={{textAlign:'center',color:'#16A34A',fontSize:13,fontWeight:500}}>✓ Saved and pushed to server</div>}
    </div>
  );
}

function Row({label,sub,children}){return<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',borderBottom:'1px solid #F3F4F6'}}><div><div style={{fontSize:13,fontWeight:500}}>{label}</div>{sub&&<div style={{fontSize:11,color:'#6B7280',marginTop:1,maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub}</div>}</div>{children}</div>;}

const SEL       = { padding:'7px 10px', border:'1px solid #E5E7EB', borderRadius:7, fontSize:12, fontFamily:'inherit', outline:'none', background:'#fff' };
const OVERLAY   = { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 };
const MODAL     = { width:340, background:'#fff', borderRadius:12, padding:22, boxShadow:'0 20px 60px rgba(0,0,0,.2)' };
const LBL       = { fontSize:12, fontWeight:500, color:'#374151', display:'block', marginBottom:5 };
const INP       = { width:'100%', padding:'8px 12px', border:'1px solid #E5E7EB', borderRadius:7, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
const CANCEL_BTN= { flex:1, padding:9, border:'1px solid #E5E7EB', borderRadius:7, background:'#fff', fontSize:13, cursor:'pointer' };
const CONFIRM_BTN={ flex:2, padding:9, border:'none', borderRadius:7, background:'#2563EB', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' };
const ACT_BTN   = { padding:'4px 9px', border:'1px solid #E5E7EB', borderRadius:5, background:'#fff', fontSize:11, cursor:'pointer', color:'#374151' };
const SECTION   = { background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden' };
const SEC_TITLE = { fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', color:'#9CA3AF', padding:'10px 14px 0' };
const NUM       = { padding:'6px 10px', border:'1px solid #E5E7EB', borderRadius:6, fontSize:13, fontFamily:'inherit', width:80, textAlign:'right', outline:'none' };
