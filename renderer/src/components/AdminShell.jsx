/**
 * AdminShell.jsx
 * Admin interface with:
 * - History tab: all employees' task histories, selectable by employee
 * - Today tab:   selectable employee or all-combined view
 * - Settings tab: idle threshold, screenshot per-employee toggle, employee
 *                 management (add, edit name/password/role, disable, delete)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ── Shared utils ─────────────────────────────────────────────────────────────
const fmtDur = s => { s=Math.max(0,Math.floor(s||0)); if(!s)return'—'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; };
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—';
const ScoreChip = ({score}) => { if(score==null)return null; const s=Math.round(score); const c=s>=80?'#16A34A':s>=60?'#D97706':'#DC2626'; const bg=s>=80?'#F0FDF4':s>=60?'#FFFBEB':'#FEF2F2'; return <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:bg,color:c}}>{s}%</span>; };

const TABS = [
  {id:'history',  label:'History',  icon:'📋'},
  {id:'today',    label:'Today',    icon:'📊'},
  {id:'settings', label:'Settings', icon:'⚙️'},
];

export default function AdminShell({ user, onLogout }) {
  const [tab, setTab] = useState('history');
  return (
    <div style={{display:'flex',height:'100vh'}}>
      {/* Sidebar */}
      <div style={{width:180,background:'#111827',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'16px 14px 12px',borderBottom:'1px solid #1F2937'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:28,height:28,borderRadius:7,background:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff'}}>WT</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>WorkTrack</div>
              <div style={{fontSize:10,color:'#6B7280'}}>Admin</div>
            </div>
          </div>
          <div style={{marginTop:10,fontSize:12,color:'#9CA3AF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</div>
        </div>
        <nav style={{padding:'10px 8px',flex:1}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'9px 10px',borderRadius:7,border:'none',cursor:'pointer',background:tab===t.id?'#1F2937':'transparent',color:tab===t.id?'#fff':'#9CA3AF',fontSize:13,marginBottom:2,textAlign:'left'}}>
              <span style={{fontSize:14}}>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        <button onClick={onLogout} style={{margin:'0 8px 12px',padding:'9px 10px',borderRadius:7,border:'none',background:'transparent',color:'#6B7280',fontSize:12,cursor:'pointer',textAlign:'left'}}>
          ⏻ Sign out
        </button>
      </div>
      {/* Content */}
      <div style={{flex:1,overflowY:'auto',background:'#F9FAFB'}}>
        {tab==='history'  && <AdminHistory  />}
        {tab==='today'    && <AdminToday    />}
        {tab==='settings' && <AdminSettings />}
      </div>
    </div>
  );
}

// ── HISTORY TAB ───────────────────────────────────────────────────────────────
function AdminHistory() {
  const [employees, setEmployees] = useState([]);
  const [selEmp,    setSelEmp]    = useState('all');
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [exp,       setExp]       = useState(null);
  const [actMap,    setActMap]    = useState({});
  const api = window.worktrack;

  useEffect(() => {
    api?.adminGetAllEmployees().then(e=>setEmployees(e||[])).catch(()=>{});
  }, []);

  useEffect(() => {
    setLoading(true); setExp(null);
    const run = async () => {
      try {
        const data = selEmp==='all'
          ? await api?.adminGetAllTasks(date)
          : await api?.adminGetEmployeeTasks(selEmp, date);
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
      try{const a=await api.getActivity(taskId);setActMap(m=>({...m,[taskId]:Array.isArray(a)?a:[]}));}
      catch{setActMap(m=>({...m,[taskId]:[]}))}
    }
  }

  return (
    <div style={{padding:20}}>
      <div style={{fontSize:18,fontWeight:600,color:'#111827',marginBottom:16}}>Task History</div>
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={SEL}>
          <option value="all">All employees</option>
          {employees.map(e=><option key={e.user_id} value={e.user_id}>{e.name}</option>)}
        </select>
        <input type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={e=>setDate(e.target.value)} style={SEL}/>
        <span style={{fontSize:12,color:'#6B7280',alignSelf:'center'}}>{tasks.length} tasks</span>
      </div>
      {loading&&<div style={{color:'#9CA3AF',fontSize:13,padding:'20px 0'}}>Loading…</div>}
      {!loading&&tasks.length===0&&<div style={{color:'#9CA3AF',fontSize:13,padding:'20px 0'}}>No completed tasks for this selection.</div>}
      {!loading&&tasks.map(task=>(
        <div key={task.task_id} style={{border:'1px solid #E5E7EB',borderRadius:10,marginBottom:8,background:'#fff',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',cursor:'pointer'}} onClick={()=>expand(task.task_id)}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{task.task_name}</div>
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>
                {task.user_name&&<span style={{fontWeight:500,color:'#6B7280',marginRight:8}}>{task.user_name}</span>}
                {fmtTime(task.start_time)} → {fmtTime(task.end_time)} · {fmtDur(task.total_duration)}
              </div>
            </div>
            <ScoreChip score={task.productivity_score}/>
            <span style={{fontSize:11,color:'#9CA3AF'}}>{exp===task.task_id?'▲':'▼'}</span>
          </div>
          {exp===task.task_id&&(
            <div style={{borderTop:'1px solid #F3F4F6',padding:'11px 14px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                {[{l:'Total',v:fmtDur(task.total_duration),c:'#374151'},{l:'Active',v:fmtDur(task.active_duration),c:'#16A34A'},{l:'Idle',v:fmtDur(task.idle_duration),c:'#D97706'}].map(x=>(
                  <div key={x.l} style={{background:'#F9FAFB',borderRadius:6,padding:'8px 10px',textAlign:'center'}}>
                    <div style={{fontSize:10,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'.04em'}}>{x.l}</div>
                    <div style={{fontSize:14,fontWeight:600,color:x.c,marginTop:2}}>{x.v}</div>
                  </div>
                ))}
              </div>
              {actMap[task.task_id]===undefined?<div style={{fontSize:12,color:'#9CA3AF'}}>Loading activity…</div>:
               actMap[task.task_id].length===0?<div style={{fontSize:12,color:'#9CA3AF'}}>No activity records.</div>:(
                <div style={{maxHeight:160,overflowY:'auto'}}>
                  {actMap[task.task_id].map((a,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0',borderBottom:'1px solid #F9FAFB',fontSize:12}}>
                      <span style={{color:'#9CA3AF',minWidth:48,fontSize:11}}>{fmtTime(a.timestamp)}</span>
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

// ── TODAY TAB ─────────────────────────────────────────────────────────────────
function AdminToday() {
  const [employees, setEmployees] = useState([]);
  const [selEmp,    setSelEmp]    = useState('all');
  const [summary,   setSummary]   = useState(null);
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const api = window.worktrack;
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api?.adminGetAllEmployees().then(e=>setEmployees(e||[])).catch(()=>{});
  }, []);

  useEffect(() => {
    setLoading(true);
    const run = async () => {
      try {
        const data = selEmp==='all'
          ? await api?.adminGetAllTasks(today)
          : await api?.adminGetEmployeeTasks(selEmp, today);
        const done = (Array.isArray(data)?data:[]).filter(t=>t.end_time);
        setTasks(done);
        // Build summary from tasks
        const totalSec  = done.reduce((s,t)=>s+(t.total_duration||0),0);
        const activeSec = done.reduce((s,t)=>s+(t.active_duration||0),0);
        const idleSec   = done.reduce((s,t)=>s+(t.idle_duration||0),0);
        const avgScore  = done.length ? done.reduce((s,t)=>s+(t.productivity_score||0),0)/done.length : 0;
        setSummary({ task_count:done.length, total_seconds:totalSec, active_seconds:activeSec, idle_seconds:idleSec, avg_score:avgScore });
      } catch { setTasks([]); setSummary(null); }
      setLoading(false);
    };
    run();
  }, [selEmp]);

  const pieData = summary ? [{name:'Active',value:summary.active_seconds,color:'#2563EB'},{name:'Idle',value:summary.idle_seconds,color:'#F59E0B'}].filter(d=>d.value>0) : [];
  const barData = tasks.slice(0,8).map(t=>({name:(t.task_name||'').slice(0,16),employee:t.user_name||'',minutes:Math.round((t.active_duration||0)/60)}));

  return (
    <div style={{padding:20}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <div style={{fontSize:18,fontWeight:600,color:'#111827'}}>Today's Overview</div>
          <div style={{fontSize:12,color:'#6B7280',marginTop:2}}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
        </div>
        <select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={SEL}>
          <option value="all">All employees</option>
          {employees.map(e=><option key={e.user_id} value={e.user_id}>{e.name}</option>)}
        </select>
      </div>

      {loading&&<div style={{color:'#9CA3AF',fontSize:13}}>Loading…</div>}
      {!loading&&summary&&(
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
            {[
              {l:'Tasks done',    v:summary.task_count,                       c:'#111827'},
              {l:'Avg score',     v:`${Math.round(summary.avg_score)}%`,      c:summary.avg_score>=80?'#16A34A':summary.avg_score>=60?'#D97706':'#DC2626'},
              {l:'Active time',   v:fmtDur(summary.active_seconds),           c:'#2563EB'},
              {l:'Idle time',     v:fmtDur(summary.idle_seconds),             c:'#D97706'},
            ].map(c=>(
              <div key={c.l} style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:'12px 14px'}}>
                <div style={{fontSize:11,color:'#6B7280',marginBottom:4}}>{c.l}</div>
                <div style={{fontSize:20,fontWeight:600,color:c.c}}>{c.v}</div>
              </div>
            ))}
          </div>

          {pieData.length>0&&summary.total_seconds>0&&(
            <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:16,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:500,marginBottom:12}}>Time breakdown</div>
              <div style={{display:'flex',alignItems:'center',gap:20}}>
                <ResponsiveContainer width={100} height={100}>
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                    {pieData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {pieData.map(d=>(
                    <div key={d.name} style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}>
                      <div style={{width:10,height:10,borderRadius:2,background:d.color}}/>
                      <span style={{fontWeight:500}}>{d.name}</span>
                      <span style={{color:'#6B7280'}}>{fmtDur(d.value)}</span>
                      <span style={{color:'#9CA3AF',fontSize:11}}>({summary.total_seconds>0?Math.round((d.value/summary.total_seconds)*100):0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:16}}>
            <div style={{fontSize:14,fontWeight:500,marginBottom:12}}>Completed tasks</div>
            {tasks.length===0?<div style={{color:'#9CA3AF',fontSize:13}}>No completed tasks today.</div>:
             tasks.map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid #F3F4F6',fontSize:13}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.task_name}</div>
                  <div style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>{t.user_name||''} · {fmtTime(t.start_time)}–{fmtTime(t.end_time)} · {fmtDur(t.total_duration)}</div>
                </div>
                <ScoreChip score={t.productivity_score}/>
              </div>
            ))}
          </div>
        </>
      )}
      {!loading&&!summary&&<div style={{color:'#9CA3AF',fontSize:13,padding:'20px 0'}}>No data available.</div>}
    </div>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────────────────────
function AdminSettings() {
  const [employees, setEmployees] = useState([]);
  const [cfg,       setCfg]       = useState({ idleThreshold:300, autoStart:true, minimizeToTray:true, serverUrl:'https://worktrack-production-599c.up.railway.app' });
  const [saved,     setSaved]     = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newRole,   setNewRole]   = useState('employee');
  const [createError, setCreateError] = useState('');
  const [created,   setCreated]   = useState(null);
  const [editing,   setEditing]   = useState(null); // {userId, name, role, password, screenshotEnabled}
  const [resetMsg,  setResetMsg]  = useState('');
  const api = window.worktrack;

  const loadEmployees = useCallback(() => {
    api?.adminGetAllEmployees().then(e=>setEmployees(e||[])).catch(()=>{});
  }, [api]);

  useEffect(() => {
    api?.getSettings().then(s=>{if(s)setCfg(prev=>({...prev,...s}));});
    loadEmployees();
  }, [loadEmployees]);

  function Toggle({value,onChange}){return <div onClick={()=>onChange(!value)} style={{width:38,height:22,borderRadius:11,background:value?'#2563EB':'#D1D5DB',position:'relative',cursor:'pointer',transition:'background .2s'}}><div style={{position:'absolute',top:2,left:value?18:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/></div>;}

  async function createEmployee() {
    const trimmed = newName.trim();
    if (!trimmed) { setCreateError('Name is required.'); return; }
    // Validate: no spaces allowed (name = user ID)
    if (/\s/.test(trimmed)) { setCreateError('Name cannot contain spaces (it becomes the User ID).'); return; }
    const res = await api?.adminCreateEmployee(trimmed, newRole);
    if (res?.success) {
      setCreated(res.employee);
      setNewName('');
      setCreateError('');
      setCreating(false);
      loadEmployees();
    } else {
      setCreateError(res?.error || 'Failed to create employee.');
    }
  }

  async function saveEdit() {
    if (!editing) return;
    await api?.adminUpdateEmployee(editing.userId, editing.name, editing.role, editing.password||undefined);
    setEditing(null); loadEmployees();
  }

  async function toggleAccess(emp) {
    const disabled = !(emp.disabled==1);
    await api?.adminToggleAccess(emp.user_id, disabled);
    loadEmployees();
  }

  async function resetPw(emp) {
    const res = await api?.adminResetPassword(emp.user_id);
    if (res?.success) { setResetMsg(`New password for ${emp.name}: ${res.newPassword}`); setTimeout(()=>setResetMsg(''),15000); }
  }

  async function delEmployee(emp) {
    if (!window.confirm(`Delete ${emp.name} and all their data? This cannot be undone.`)) return;
    await api?.adminDeleteEmployee(emp.user_id);
    loadEmployees();
  }

  const saveSettings = async () => {
    // Save locally
    await api?.saveSettings(cfg);
    // Push idle threshold to server so it applies to ALL employees
    try {
      const token = localStorage.getItem ? localStorage.getItem('wt_token') : null;
      // Push via sync endpoint — server stores it for employee clients to fetch
      const serverUrl = cfg.serverUrl || 'https://worktrack-production-599c.up.railway.app';
      await fetch(`${serverUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idleThreshold: cfg.idleThreshold }),
      });
    } catch {}
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  return (
    <div style={{padding:20,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{fontSize:18,fontWeight:600,color:'#111827'}}>Settings</div>

      {/* General settings */}
      <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,overflow:'hidden'}}>
        <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',color:'#9CA3AF',padding:'12px 16px 0'}}>General</div>
        {[
          {label:'Idle threshold (s)', sub:'Mark idle after this many seconds', ctrl:<input type="number" min={30} max={3600} value={cfg.idleThreshold} onChange={e=>setCfg(c=>({...c,idleThreshold:parseInt(e.target.value)||300}))} style={NUM}/>},
          {label:'Server URL', sub:'Admin sync server', ctrl:<input value={cfg.serverUrl} onChange={e=>setCfg(c=>({...c,serverUrl:e.target.value}))} style={{...NUM,width:160,textAlign:'left'}}/>},
          {label:'Auto-start', sub:'Launch with Windows', ctrl:<Toggle value={cfg.autoStart} onChange={v=>setCfg(c=>({...c,autoStart:v}))}/>},
          {label:'Minimize to tray', sub:'Keep running when closed', ctrl:<Toggle value={cfg.minimizeToTray} onChange={v=>setCfg(c=>({...c,minimizeToTray:v}))}/>},
        ].map((r,i,arr)=>(
          <div key={r.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:i<arr.length-1?'1px solid #F3F4F6':'none'}}>
            <div><div style={{fontSize:13,fontWeight:500}}>{r.label}</div><div style={{fontSize:11,color:'#6B7280',marginTop:2}}>{r.sub}</div></div>
            {r.ctrl}
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <button onClick={saveSettings} style={{padding:'10px 20px',background:'#2563EB',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>Save settings</button>
        {saved&&<span style={{color:'#16A34A',fontSize:13,fontWeight:500}}>✓ Saved</span>}
      </div>

      {/* Employee management */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
        <div style={{fontSize:16,fontWeight:600,color:'#111827'}}>Employees ({employees.length})</div>
        <button onClick={()=>setCreating(true)} style={{padding:'8px 14px',background:'#2563EB',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:500,cursor:'pointer'}}>+ Add employee</button>
      </div>

      {/* Create modal */}
      {creating&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{width:360,background:'#fff',borderRadius:12,padding:24,boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
            <div style={{fontSize:16,fontWeight:600,marginBottom:16}}>Add employee</div>
            <label style={LBL}>Name / User ID <span style={{color:'#6B7280',fontWeight:400,fontSize:11}}>(case-sensitive · no spaces · must be unique)</span></label>
            <input style={INP} value={newName} onChange={e=>{setNewName(e.target.value);setCreateError('');}} placeholder="e.g. JaneSmith or Jane.Smith" autoFocus onKeyDown={e=>e.key==='Enter'&&createEmployee()}/>
            <div style={{fontSize:11,color:'#6B7280',marginTop:4}}>This exact name becomes the login User ID. <strong>JaneSmith</strong> and <strong>janesmith</strong> are different users.</div>
            {createError && <div style={{marginTop:8,padding:'8px 12px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:6,color:'#DC2626',fontSize:13}}>{createError}</div>}
            <label style={{...LBL,marginTop:12}}>Role</label>
            <select style={INP} value={newRole} onChange={e=>setNewRole(e.target.value)}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onClick={()=>setCreating(false)} style={{flex:1,padding:10,border:'1px solid #E5E7EB',borderRadius:8,background:'#fff',fontSize:13,cursor:'pointer'}}>Cancel</button>
              <button onClick={createEmployee} disabled={!newName.trim()} style={{flex:2,padding:10,border:'none',borderRadius:8,background:'#2563EB',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer'}}>Create & generate credentials</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{width:360,background:'#fff',borderRadius:12,padding:24,boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
            <div style={{fontSize:16,fontWeight:600,marginBottom:16}}>Edit employee</div>
            <label style={LBL}>User ID / Name <span style={{color:'#9CA3AF',fontWeight:400,fontSize:11}}>(cannot be changed)</span></label>
            <input style={{...INP,background:'#F9FAFB',color:'#9CA3AF',cursor:'not-allowed'}} value={editing.name} readOnly/>
            <label style={{...LBL,marginTop:12}}>Role</label>
            <select style={INP} value={editing.role} onChange={e=>setEditing(x=>({...x,role:e.target.value}))}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <label style={{...LBL,marginTop:12}}>New password <span style={{fontWeight:400,color:'#9CA3AF'}}>(leave blank to keep current)</span></label>
            <input style={INP} type="password" value={editing.password||''} onChange={e=>setEditing(x=>({...x,password:e.target.value}))} placeholder="••••••••"/>
            <label style={{...LBL,marginTop:12}}>Screenshot capture</label>
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
              <div onClick={()=>setEditing(x=>({...x,screenshotEnabled:!x.screenshotEnabled}))} style={{width:38,height:22,borderRadius:11,background:editing.screenshotEnabled?'#2563EB':'#D1D5DB',position:'relative',cursor:'pointer',transition:'background .2s'}}>
                <div style={{position:'absolute',top:2,left:editing.screenshotEnabled?18:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
              </div>
              <span style={{fontSize:13,color:'#374151'}}>{editing.screenshotEnabled?'Enabled':'Disabled'}</span>
            </div>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onClick={()=>setEditing(null)} style={{flex:1,padding:10,border:'1px solid #E5E7EB',borderRadius:8,background:'#fff',fontSize:13,cursor:'pointer'}}>Cancel</button>
              <button onClick={saveEdit} style={{flex:2,padding:10,border:'none',borderRadius:8,background:'#2563EB',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer'}}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Created credentials */}
      {created&&(
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,padding:16}}>
          <div style={{fontSize:14,fontWeight:600,color:'#166534',marginBottom:8}}>✓ Employee created — share these credentials:</div>
          <div style={{fontFamily:'monospace',fontSize:13,color:'#14532D',lineHeight:2}}>
            <div><strong>User ID (login):</strong> <code style={{background:'#E5E7EB',padding:'1px 6px',borderRadius:3,fontFamily:'monospace'}}>{created.user_id}</code></div>
            <div><strong>Password:</strong> <code style={{background:'#E5E7EB',padding:'1px 6px',borderRadius:3,fontFamily:'monospace'}}>{created.plainPassword}</code></div>
            <div><strong>Password:</strong> {created.plainPassword}</div>
          </div>
          <div style={{fontSize:11,color:'#16A34A',marginTop:6}}>Save this password — it won't be shown again.</div>
          <button onClick={()=>setCreated(null)} style={{marginTop:10,padding:'6px 14px',border:'1px solid #16A34A',borderRadius:6,background:'#fff',color:'#16A34A',fontSize:12,cursor:'pointer'}}>Dismiss</button>
        </div>
      )}

      {/* Reset password result */}
      {resetMsg&&(
        <div style={{background:'#FEF3C7',border:'1px solid #FDE68A',borderRadius:10,padding:12,fontSize:13,color:'#92400E',fontFamily:'monospace'}}>
          🔑 {resetMsg}
        </div>
      )}

      {/* Employee list */}
      {employees.map(emp=>(
        <div key={emp.user_id} style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:14}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:'50%',background: emp.role==='admin'?'#EDE9FE':'#DBEAFE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:emp.role==='admin'?'#6D28D9':'#1D4ED8',flexShrink:0}}>
              {emp.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600}}>{emp.name} {emp.disabled==1&&<span style={{fontSize:10,fontWeight:500,padding:'1px 7px',borderRadius:20,background:'#FEF2F2',color:'#DC2626',marginLeft:6}}>Disabled</span>}</div>
              <div style={{fontSize:11,color:'#6B7280',marginTop:1}}>Login ID: <code style={{fontFamily:'monospace',background:'#F3F4F6',padding:'1px 5px',borderRadius:3}}>{emp.user_id}</code> · {emp.role}</div>
            </div>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <button onClick={()=>setEditing({userId:emp.user_id,name:emp.name,role:emp.role,password:'',screenshotEnabled:false})}
                style={{padding:'5px 10px',border:'1px solid #E5E7EB',borderRadius:6,background:'#fff',fontSize:11,cursor:'pointer',color:'#374151'}}>Edit</button>
              <button onClick={()=>toggleAccess(emp)}
                style={{padding:'5px 10px',border:`1px solid ${emp.disabled==1?'#BBF7D0':'#FDE68A'}`,borderRadius:6,background:emp.disabled==1?'#F0FDF4':'#FFFBEB',fontSize:11,cursor:'pointer',color:emp.disabled==1?'#16A34A':'#D97706'}}>
                {emp.disabled==1?'Enable':'Disable'}
              </button>
              {emp.user_id!=='admin'&&(
                <button onClick={()=>delEmployee(emp)}
                  style={{padding:'5px 10px',border:'1px solid #FECACA',borderRadius:6,background:'#FEF2F2',fontSize:11,cursor:'pointer',color:'#DC2626'}}>Delete</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const SEL = {padding:'7px 10px',border:'1px solid #E5E7EB',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff'};
const LBL = {fontSize:12,fontWeight:500,color:'#374151',display:'block',marginBottom:5};
const INP = {width:'100%',padding:'9px 12px',border:'1px solid #E5E7EB',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'};
const NUM = {padding:'6px 10px',border:'1px solid #E5E7EB',borderRadius:6,fontSize:13,fontFamily:'inherit',width:80,textAlign:'right',outline:'none'};
