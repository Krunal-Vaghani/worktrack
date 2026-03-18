import React, { useState, useEffect, useCallback } from 'react';
import api from '../hooks/useApi.js';

const STATUS_COLOR = { online:'#16A34A', idle:'#D97706', offline:'#9CA3AF' };
const STATUS_BG    = { online:'#F0FDF4', idle:'#FFFBEB', offline:'#F9FAFB' };
const AVATARS      = ['#EDE9FE','#DBEAFE','#ECFDF5','#FEF3C7','#FCE7F3','#FEF2F2'];

function fmtDur(s) { if(!s)return'—'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; }

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [selected,  setSelected]  = useState(null);
  const [empTasks,  setEmpTasks]  = useState([]);
  const [taskDate,  setTaskDate]  = useState(new Date().toISOString().split('T')[0]);
  const [creating,  setCreating]  = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newRole,   setNewRole]   = useState('employee');
  const [createErr, setCreateErr] = useState('');
  const [created,   setCreated]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/employees').then(data => { setEmployees(Array.isArray(data)?data:[]); setLoading(false); })
      .catch(() => { setEmployees([]); setLoading(false); });
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  useEffect(() => {
    if (!selected) return;
    api.get(`/employees/${selected.user_id}/tasks?date=${taskDate}`)
      .then(data => setEmpTasks(Array.isArray(data)?data:[]))
      .catch(() => setEmpTasks([]));
  }, [selected, taskDate]);

  async function createEmployee() {
    const name = newName.trim();
    if (!name) { setCreateErr('Name is required'); return; }
    if (/\s/.test(name)) { setCreateErr('No spaces allowed — use e.g. JaneSmith'); return; }
    try {
      const res = await api.post('/employees', { name, role: newRole });
      if (res.error) { setCreateErr(res.error); return; }
      setCreated({ user_id: name, name, plainPassword: 'Set via admin Electron app' });
      setNewName(''); setCreating(false); load();
    } catch (e) { setCreateErr(e.message); }
  }

  async function toggleActive(emp) {
    await api.patch(`/employees/${emp.user_id}`, { active: !emp.active });
    load();
  }

  async function deleteEmployee(emp) {
    if (!confirm(`Delete ${emp.name} and all their data?`)) return;
    await api.delete(`/employees/${emp.user_id}`);
    if (selected?.user_id === emp.user_id) setSelected(null);
    load();
  }

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return (e.name?.toLowerCase().includes(q) || e.user_id?.toLowerCase().includes(q))
      && (filter === 'all' || e.status === filter);
  });

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>Employees</h1>
          <p style={S.sub}>{employees.length} tracked · {employees.filter(e=>e.status==='online').length} online now</p>
        </div>
        <button style={S.addBtn} onClick={() => setCreating(true)}>+ Add Employee</button>
      </div>

      {/* Create modal */}
      {creating && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Add Employee</div>
            <label style={S.lbl}>Name / User ID <span style={{color:'#9CA3AF',fontWeight:400,fontSize:11}}>(case-sensitive, no spaces)</span></label>
            <input style={S.inp} value={newName} onChange={e=>{setNewName(e.target.value);setCreateErr('');}} placeholder="e.g. JaneSmith" autoFocus onKeyDown={e=>e.key==='Enter'&&createEmployee()}/>
            {createErr && <div style={S.err}>{createErr}</div>}
            <label style={{...S.lbl,marginTop:12}}>Role</label>
            <select style={S.inp} value={newRole} onChange={e=>setNewRole(e.target.value)}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onClick={()=>{setCreating(false);setCreateErr('');}} style={S.cancelBtn}>Cancel</button>
              <button onClick={createEmployee} style={S.confirmBtn}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Created notice */}
      {created && (
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,padding:16,marginBottom:16}}>
          <div style={{fontWeight:600,color:'#166534',marginBottom:8}}>✓ Employee created</div>
          <div style={{fontSize:13,fontFamily:'monospace',color:'#14532D',lineHeight:2}}>
            <div>User ID: <strong>{created.user_id}</strong></div>
            <div>Set password via the Electron admin panel → Settings → Employees</div>
          </div>
          <button onClick={()=>setCreated(null)} style={{marginTop:8,padding:'4px 12px',border:'1px solid #16A34A',borderRadius:6,background:'#fff',color:'#16A34A',fontSize:12,cursor:'pointer'}}>Dismiss</button>
        </div>
      )}

      <div style={S.toolbar}>
        <input style={S.search} placeholder="Search employees…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={S.tabs}>
          {['all','online','idle','offline'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{...S.tab,...(filter===f?S.tabActive:{})}}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{color:'#9CA3AF',fontSize:13,padding:'20px 0'}}>Loading…</div>}

      <div style={{display:'grid',gridTemplateColumns:selected?'280px 1fr':'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
        {/* Employee cards */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {!loading && filtered.length === 0 && (
            <div style={{color:'#9CA3AF',fontSize:13,padding:'20px 0'}}>
              {employees.length === 0 ? 'No employees yet. Click "+ Add Employee" to add one.' : 'No matches.'}
            </div>
          )}
          {filtered.map((emp, i) => (
            <div key={emp.user_id} onClick={()=>setSelected(selected?.user_id===emp.user_id?null:emp)}
              style={{...S.empCard, borderColor: selected?.user_id===emp.user_id?'#BFDBFE':'#E5E7EB', background: selected?.user_id===emp.user_id?'#EFF6FF':'#fff'}}>
              <div style={S.empTop}>
                <div style={{...S.avatar,background:AVATARS[i%AVATARS.length]}}>
                  {emp.name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={S.empName}>{emp.name}</div>
                  <div style={{fontSize:11,color:'#6B7280',fontFamily:'monospace'}}>ID: {emp.user_id}</div>
                </div>
                <span style={{...S.statusBadge,background:STATUS_BG[emp.status]||'#F9FAFB',color:STATUS_COLOR[emp.status]||'#9CA3AF'}}>
                  {emp.status||'offline'}
                </span>
              </div>
              <div style={S.empStats}>
                <div style={S.stat}><div style={S.statVal}>{emp.avg_score||0}%</div><div style={S.statLabel}>Score</div></div>
                <div style={S.stat}><div style={S.statVal}>{emp.total_hours||0}h</div><div style={S.statLabel}>Hours</div></div>
                <div style={S.stat}><div style={S.statVal}>{emp.total_tasks||0}</div><div style={S.statLabel}>Tasks</div></div>
              </div>
              <div style={{...S.scoreBarWrap}}><div style={{...S.scoreBarFill,width:`${emp.avg_score||0}%`,background:emp.avg_score>=85?'#16A34A':emp.avg_score>=70?'#D97706':'#DC2626'}}/></div>
              <div style={{display:'flex',gap:6,marginTop:8}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>toggleActive(emp)} style={{...S.actionBtn,color:emp.active===false?'#16A34A':'#D97706',borderColor:emp.active===false?'#BBF7D0':'#FDE68A',background:emp.active===false?'#F0FDF4':'#FFFBEB'}}>
                  {emp.active===false?'Enable':'Disable'}
                </button>
                {emp.user_id!=='admin'&&<button onClick={()=>deleteEmployee(emp)} style={{...S.actionBtn,color:'#DC2626',borderColor:'#FECACA',background:'#FEF2F2'}}>Delete</button>}
              </div>
            </div>
          ))}
        </div>

        {/* Task detail panel */}
        {selected && (
          <div style={S.detailPanel}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:600}}>{selected.name}'s tasks</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="date" value={taskDate} max={new Date().toISOString().split('T')[0]} onChange={e=>setTaskDate(e.target.value)}
                  style={{padding:'6px 10px',border:'1px solid #E5E7EB',borderRadius:6,fontSize:12,fontFamily:'inherit'}}/>
                <button onClick={()=>setSelected(null)} style={{border:'none',background:'none',cursor:'pointer',fontSize:18,color:'#9CA3AF'}}>✕</button>
              </div>
            </div>
            {empTasks.length===0
              ? <div style={{color:'#9CA3AF',fontSize:13}}>No completed tasks for this date.</div>
              : empTasks.filter(t=>t.end_time).map((t,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid #F3F4F6',fontSize:13}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500}}>{t.task_name}</div>
                    <div style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>
                      {new Date(t.start_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} → {t.end_time?new Date(t.end_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'running'}
                      {' · '}{fmtDur(t.total_duration)}
                    </div>
                  </div>
                  {t.productivity_score!=null&&(
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:t.productivity_score>=80?'#F0FDF4':t.productivity_score>=60?'#FFFBEB':'#FEF2F2',color:t.productivity_score>=80?'#16A34A':t.productivity_score>=60?'#D97706':'#DC2626'}}>
                      {Math.round(t.productivity_score)}%
                    </span>
                  )}
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  page:       { padding:28 },
  header:     { display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20 },
  h1:         { fontSize:22,fontWeight:600,color:'#111827' },
  sub:        { fontSize:13,color:'#6B7280',marginTop:2 },
  addBtn:     { padding:'9px 18px',borderRadius:8,border:'none',background:'#2563EB',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer' },
  toolbar:    { display:'flex',gap:12,marginBottom:20,alignItems:'center',flexWrap:'wrap' },
  search:     { padding:'9px 12px',border:'1px solid #E5E7EB',borderRadius:8,fontSize:13,width:240,outline:'none' },
  tabs:       { display:'flex',gap:4 },
  tab:        { padding:'7px 14px',border:'1px solid #E5E7EB',borderRadius:8,background:'#fff',fontSize:12,color:'#6B7280',cursor:'pointer' },
  tabActive:  { background:'#EFF6FF',borderColor:'#BFDBFE',color:'#2563EB' },
  empCard:    { background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:16,cursor:'pointer',transition:'border-color .15s' },
  empTop:     { display:'flex',alignItems:'center',gap:10,marginBottom:12 },
  avatar:     { width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#374151',flexShrink:0 },
  empName:    { fontSize:14,fontWeight:500,color:'#111827' },
  statusBadge:{ padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:500,flexShrink:0 },
  empStats:   { display:'flex',justifyContent:'space-between',marginBottom:10 },
  stat:       { textAlign:'center' },
  statVal:    { fontSize:14,fontWeight:600,color:'#111827' },
  statLabel:  { fontSize:10,color:'#9CA3AF',marginTop:1 },
  scoreBarWrap:{ height:4,background:'#F3F4F6',borderRadius:2,overflow:'hidden' },
  scoreBarFill:{ height:'100%',borderRadius:2,transition:'width .3s' },
  actionBtn:  { flex:1,padding:'5px 0',border:'1px solid',borderRadius:6,fontSize:11,cursor:'pointer',fontFamily:'inherit' },
  detailPanel:{ background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:18 },
  overlay:    { position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100 },
  modal:      { background:'#fff',borderRadius:12,padding:24,width:360,boxShadow:'0 20px 60px rgba(0,0,0,.2)' },
  modalTitle: { fontSize:16,fontWeight:600,marginBottom:16 },
  lbl:        { fontSize:12,fontWeight:500,color:'#374151',display:'block',marginBottom:5 },
  inp:        { width:'100%',padding:'9px 12px',border:'1px solid #E5E7EB',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box' },
  err:        { marginTop:8,padding:'8px 12px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:6,color:'#DC2626',fontSize:13 },
  cancelBtn:  { flex:1,padding:10,border:'1px solid #E5E7EB',borderRadius:8,background:'#fff',fontSize:13,cursor:'pointer' },
  confirmBtn: { flex:2,padding:10,border:'none',borderRadius:8,background:'#2563EB',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer' },
};
