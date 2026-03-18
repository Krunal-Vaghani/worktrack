/**
 * AdminPanel.jsx
 * Admin tab: create/manage employees, view all tasks, reset passwords.
 */
import React, { useState, useEffect, useCallback } from 'react';

const pad = n => String(n).padStart(2,'0');
function fmtDur(s) {
  s = Math.max(0, Math.floor(s || 0));
  if (!s) return '—';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { month:'short', day:'numeric' });
}

const AVATAR_COLORS = ['#EDE9FE','#DBEAFE','#ECFDF5','#FEF3C7','#FCE7F3','#FEF2F2','#E0F2FE','#FEF9C3'];
const AVATAR_TEXT   = ['#6D28D9','#1D4ED8','#065F46','#92400E','#9D174D','#991B1B','#0369A1','#854D0E'];

function ScoreChip({ score }) {
  if (score == null) return <span style={{ color:'#9CA3AF', fontSize:11 }}>—</span>;
  const s = Math.round(score);
  const color = s>=80?'#16A34A':s>=60?'#D97706':'#DC2626';
  const bg    = s>=80?'#F0FDF4':s>=60?'#FFFBEB':'#FEF2F2';
  return <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:bg, color }}>{s}%</span>;
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function EmployeeCard({ emp, idx, onSelect, onReset, onDelete }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:16,
      cursor:'pointer', transition:'box-shadow .15s' }}
      onClick={() => onSelect(emp)}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0,
          background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
          color: AVATAR_TEXT[idx % AVATAR_TEXT.length],
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600 }}>
          {emp.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{emp.name}</div>
          <div style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>ID: <strong style={{color:'#374151'}}>{emp.user_id}</strong></div>
        </div>
        <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:20,
          background: emp.role==='admin'?'#EDE9FE':'#F0FDF4',
          color: emp.role==='admin'?'#6D28D9':'#16A34A' }}>{emp.role}</span>
      </div>
      <div style={{ fontSize:11, color:'#6B7280', marginBottom:10, wordBreak:'break-all' }}>
        Password: <span style={{ fontFamily:'monospace', color:'#374151' }}>{emp._plainPassword || '(set)'}</span>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <button onClick={e=>{e.stopPropagation();onSelect(emp);}} style={S.btnSm}>View tasks</button>
        <button onClick={e=>{e.stopPropagation();onReset(emp);}} style={S.btnSm}>Reset pwd</button>
        {emp.role !== 'admin' && (
          <button onClick={e=>{e.stopPropagation();onDelete(emp);}} style={{...S.btnSm, color:'#DC2626', borderColor:'#FECACA'}}>Delete</button>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  const [expanded, setExpanded] = useState(false);
  const [activity, setActivity] = useState(null);

  async function loadActivity() {
    if (activity !== null) { setExpanded(!expanded); return; }
    const acts = await window.worktrack?.getActivity(task.task_id);
    setActivity(Array.isArray(acts) ? acts : []);
    setExpanded(true);
  }

  return (
    <div style={{ border:'1px solid #E5E7EB', borderRadius:8, marginBottom:6, background:'#fff', overflow:'hidden' }}>
      <div onClick={loadActivity} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {task.task_name}
          </div>
          <div style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>
            {fmtTime(task.start_time)} – {fmtTime(task.end_time)} · {fmtDur(task.total_duration)}
            {task.user_name && <span style={{ marginLeft:6, color:'#6B7280' }}>· {task.user_name}</span>}
          </div>
        </div>
        <ScoreChip score={task.productivity_score} />
        <span style={{ fontSize:10, color:'#9CA3AF' }}>{expanded?'▲':'▼'}</span>
      </div>
      {expanded && activity !== null && (
        <div style={{ borderTop:'1px solid #F3F4F6', padding:'8px 12px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:8 }}>
            {[{l:'Total',v:fmtDur(task.total_duration),c:'#374151'},{l:'Active',v:fmtDur(task.active_duration),c:'#16A34A'},{l:'Idle',v:fmtDur(task.idle_duration),c:'#D97706'}].map(c=>(
              <div key={c.l} style={{ background:'#F9FAFB', borderRadius:6, padding:'6px 8px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#9CA3AF' }}>{c.l}</div>
                <div style={{ fontSize:13, fontWeight:600, color:c.c }}>{c.v}</div>
              </div>
            ))}
          </div>
          {activity.length === 0
            ? <div style={{ fontSize:12, color:'#9CA3AF' }}>No activity recorded.</div>
            : <div style={{ maxHeight:140, overflowY:'auto' }}>
                {activity.map((a,i)=>(
                  <div key={i} style={{ display:'flex', gap:8, fontSize:11, padding:'3px 0', borderBottom:'1px solid #F9FAFB' }}>
                    <span style={{ color:'#9CA3AF', minWidth:48 }}>{fmtTime(a.timestamp)}</span>
                    <span style={{ flex:1, fontWeight:500 }}>{a.application_name}</span>
                    <span style={{ color:'#9CA3AF' }}>{fmtDur(a.duration)}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPanel({ refreshSig, isActive }) {
  const [view,       setView]      = useState('employees'); // employees | tasks | new
  const [employees,  setEmployees] = useState([]);
  const [tasks,      setTasks]     = useState([]);
  const [loading,    setLoading]   = useState(false);
  const [taskDate,   setTaskDate]  = useState(new Date().toISOString().split('T')[0]);
  const [selected,   setSelected]  = useState(null); // selected employee for task view
  const [newName,    setNewName]   = useState('');
  const [newRole,    setNewRole]   = useState('employee');
  const [newResult,  setNewResult] = useState(null); // { user_id, plainPassword, name }
  const [toast,      setToast]     = useState('');

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''), 3000); };

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const data = await window.worktrack?.adminGetEmployees();
    setEmployees(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    let data;
    if (selected) {
      data = await window.worktrack?.adminGetEmployeeTasks(selected.user_id, taskDate);
    } else {
      data = await window.worktrack?.adminGetAllTasks(taskDate);
    }
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [selected, taskDate]);

  useEffect(() => {
    if (!isActive && refreshSig === 0) return;
    if (view === 'employees') loadEmployees();
    else if (view === 'tasks') loadTasks();
  }, [refreshSig, isActive, view, loadEmployees, loadTasks]);

  async function createEmployee() {
    if (!newName.trim()) return;
    const res = await window.worktrack?.adminCreateEmployee(newName.trim(), newRole);
    if (res?.success) {
      setNewResult(res.employee);
      setNewName('');
      loadEmployees();
    }
  }

  async function resetPassword(emp) {
    const res = await window.worktrack?.adminResetPassword(emp.user_id);
    if (res?.success) {
      showToast(`New password for ${emp.name}: ${res.newPassword}`);
      setEmployees(prev => prev.map(e => e.user_id===emp.user_id ? {...e, _plainPassword: res.newPassword} : e));
    }
  }

  async function deleteEmployee(emp) {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    await window.worktrack?.adminDeleteEmployee(emp.user_id);
    showToast(`${emp.name} deleted`);
    loadEmployees();
  }

  return (
    <div style={{ padding:16 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:54, left:'50%', transform:'translateX(-50%)', zIndex:999,
          background:'#111827', color:'#fff', padding:'8px 16px', borderRadius:8, fontSize:13, maxWidth:340, textAlign:'center' }}>
          {toast}
        </div>
      )}

      {/* Sub-nav */}
      <div style={{ display:'flex', gap:6, marginBottom:16, borderBottom:'1px solid #E5E7EB', paddingBottom:10 }}>
        {[{id:'employees',label:'👥 Employees'},{id:'tasks',label:'📋 All Tasks'},{id:'new',label:'➕ New Employee'}].map(v=>(
          <button key={v.id} onClick={()=>{setView(v.id); setSelected(null);}} style={{
            padding:'6px 12px', borderRadius:6, border:'1px solid #E5E7EB', fontSize:12, cursor:'pointer',
            background: view===v.id?'#EFF6FF':'#fff', color: view===v.id?'#2563EB':'#374151',
            fontWeight: view===v.id?600:400, borderColor: view===v.id?'#BFDBFE':'#E5E7EB'
          }}>{v.label}</button>
        ))}
        <button onClick={()=>{ view==='employees'?loadEmployees():loadTasks(); }} style={{...S.btnSm, marginLeft:'auto'}}>↻ Refresh</button>
      </div>

      {/* ── EMPLOYEES VIEW ── */}
      {view === 'employees' && (
        <>
          <div style={{ fontSize:13, fontWeight:500, color:'#6B7280', marginBottom:12 }}>
            {employees.length} account{employees.length!==1?'s':''} registered
          </div>
          {loading && <div style={S.loading}>Loading…</div>}
          {!loading && employees.length === 0 && <div style={S.empty}>No employees yet. Create one below.</div>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
            {employees.map((emp,i) => (
              <EmployeeCard key={emp.user_id} emp={emp} idx={i}
                onSelect={e=>{ setSelected(e); setView('tasks'); }}
                onReset={resetPassword}
                onDelete={deleteEmployee} />
            ))}
          </div>
        </>
      )}

      {/* ── TASKS VIEW ── */}
      {view === 'tasks' && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            {selected && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 12px',
                background:'#EFF6FF', borderRadius:20, border:'1px solid #BFDBFE', fontSize:12 }}>
                <span style={{ color:'#1D4ED8', fontWeight:500 }}>{selected.name}</span>
                <button onClick={()=>setSelected(null)} style={{ border:'none', background:'none', cursor:'pointer', color:'#6B7280', fontSize:14, padding:0 }}>✕</button>
              </div>
            )}
            {!selected && <span style={{ fontSize:13, color:'#6B7280' }}>All employees</span>}
            <input type="date" value={taskDate} max={new Date().toISOString().split('T')[0]}
              onChange={e=>setTaskDate(e.target.value)}
              style={{ padding:'6px 10px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', marginLeft:'auto' }} />
          </div>
          {loading && <div style={S.loading}>Loading…</div>}
          {!loading && tasks.length===0 && <div style={S.empty}>No completed tasks for this date{selected?` from ${selected.name}`:''}.</div>}
          {tasks.filter(t=>t.end_time).map(t=><TaskRow key={t.task_id} task={t} />)}
        </>
      )}

      {/* ── NEW EMPLOYEE VIEW ── */}
      {view === 'new' && (
        <div style={{ maxWidth:380 }}>
          <div style={{ fontSize:14, fontWeight:500, color:'#111827', marginBottom:16 }}>Create new account</div>

          <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
            <div>
              <label style={S.lbl}>Full name</label>
              <input style={S.input} value={newName} onChange={e=>setNewName(e.target.value)}
                placeholder="e.g. John Smith" onKeyDown={e=>e.key==='Enter'&&createEmployee()} />
            </div>
            <div>
              <label style={S.lbl}>Role</label>
              <select style={S.input} value={newRole} onChange={e=>setNewRole(e.target.value)}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button style={S.btnPrimary} onClick={createEmployee} disabled={!newName.trim()}>
              Generate credentials
            </button>
          </div>

          {newResult && (
            <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#166534', marginBottom:12 }}>
                ✓ Account created for {newResult.name}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'User ID (login name)', value: newResult.user_id },
                  { label:'Password',             value: newResult.plainPassword },
                ].map(f => (
                  <div key={f.label} style={{ background:'#fff', borderRadius:8, padding:'10px 12px', border:'1px solid #BBF7D0' }}>
                    <div style={{ fontSize:11, color:'#6B7280', marginBottom:3 }}>{f.label}</div>
                    <div style={{ fontSize:15, fontFamily:'monospace', fontWeight:600, color:'#111827',
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      {f.value}
                      <button onClick={()=>{ navigator.clipboard?.writeText(f.value); showToast('Copied!'); }}
                        style={{ fontSize:11, padding:'2px 8px', border:'1px solid #E5E7EB', borderRadius:4,
                          background:'#fff', cursor:'pointer', color:'#374151', marginLeft:8 }}>Copy</button>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:11, color:'#6B7280', marginTop:10 }}>
                Share these credentials with the employee. They can change their password in Settings after logging in.
              </p>
              <button onClick={()=>setNewResult(null)} style={{ ...S.btnSm, marginTop:8, width:'100%' }}>
                Create another
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  lbl:       { display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:5 },
  input:     { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', color:'#111827' },
  btnSm:     { padding:'5px 12px', border:'1px solid #E5E7EB', borderRadius:6, background:'#fff', fontSize:12, cursor:'pointer', color:'#374151' },
  btnPrimary:{ width:'100%', padding:11, border:'none', borderRadius:8, background:'#2563EB', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' },
  loading:   { padding:'30px 0', textAlign:'center', color:'#9CA3AF', fontSize:13 },
  empty:     { padding:'30px 0', textAlign:'center', color:'#9CA3AF', fontSize:13 },
};
