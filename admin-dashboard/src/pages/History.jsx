import React, { useState, useEffect } from 'react';
import api from '../hooks/useApi.js';

const fmtDur  = s => { s=Math.max(0,Math.floor(s||0)); if(!s)return'—'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; };
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—';
const ScoreChip = ({score}) => { if(score==null)return null; const s=Math.round(score); const c=s>=80?'#16A34A':s>=60?'#D97706':'#DC2626'; const bg=s>=80?'#F0FDF4':s>=60?'#FFFBEB':'#FEF2F2'; return <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:bg,color:c}}>{s}%</span>; };

export default function History() {
  const [employees, setEmployees] = useState([]);
  const [selEmp,    setSelEmp]    = useState('all');
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [exp,       setExp]       = useState(null);
  const [actMap,    setActMap]    = useState({});

  useEffect(() => { api.get('/employees').then(e=>setEmployees(Array.isArray(e)?e:[])).catch(()=>{}); }, []);

  useEffect(() => {
    setLoading(true); setExp(null);
    const params = new URLSearchParams({ date });
    if (selEmp !== 'all') params.set('userId', selEmp);
    api.get(`/tasks?${params}&limit=200`)
      .then(data => { setTasks(Array.isArray(data)?data.filter(t=>t.end_time):[]); setLoading(false); })
      .catch(() => { setTasks([]); setLoading(false); });
  }, [selEmp, date]);

  async function expand(taskId) {
    if (exp===taskId){setExp(null);return;}
    setExp(taskId);
    if (!actMap[taskId]) {
      api.get(`/activity?taskId=${taskId}`)
        .then(a=>setActMap(m=>({...m,[taskId]:Array.isArray(a)?a:[]})))
        .catch(()=>setActMap(m=>({...m,[taskId]:[]})));
    }
  }

  return (
    <div style={{padding:24}}>
      <h1 style={{fontSize:22,fontWeight:600,color:'#111827',marginBottom:16}}>History</h1>
      <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap',alignItems:'center'}}>
        <select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={SEL}>
          <option value="all">All employees</option>
          {employees.map(e=><option key={e.user_id} value={e.user_id}>{e.name}</option>)}
        </select>
        <input type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={e=>setDate(e.target.value)} style={SEL}/>
        <span style={{fontSize:12,color:'#9CA3AF'}}>{tasks.length} tasks</span>
      </div>
      {loading&&<div style={{color:'#9CA3AF',fontSize:13}}>Loading…</div>}
      {!loading&&tasks.length===0&&<div style={{color:'#9CA3AF',fontSize:13}}>No completed tasks for this selection.</div>}
      {tasks.map(task=>(
        <div key={task.task_id} style={{border:'1px solid #E5E7EB',borderRadius:10,marginBottom:8,background:'#fff',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',cursor:'pointer'}} onClick={()=>expand(task.task_id)}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{task.task_name}</div>
              <div style={{fontSize:12,color:'#9CA3AF',marginTop:2}}>
                {task.user_name&&<span style={{fontWeight:500,color:'#6B7280',marginRight:8}}>{task.user_name}</span>}
                {fmtTime(task.start_time)} → {fmtTime(task.end_time)} · {fmtDur(task.total_duration)}
              </div>
            </div>
            <ScoreChip score={task.productivity_score}/>
            <span style={{fontSize:12,color:'#9CA3AF'}}>{exp===task.task_id?'▲':'▼'}</span>
          </div>
          {exp===task.task_id&&(
            <div style={{borderTop:'1px solid #F3F4F6',padding:'12px 16px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:12}}>
                {[{l:'Total',v:fmtDur(task.total_duration),c:'#374151'},{l:'Active',v:fmtDur(task.active_duration),c:'#16A34A'},{l:'Idle',v:fmtDur(task.idle_duration),c:'#D97706'}].map(x=>(
                  <div key={x.l} style={{background:'#F9FAFB',borderRadius:8,padding:'10px',textAlign:'center'}}>
                    <div style={{fontSize:11,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'.04em'}}>{x.l}</div>
                    <div style={{fontSize:15,fontWeight:600,color:x.c,marginTop:3}}>{x.v}</div>
                  </div>
                ))}
              </div>
              {actMap[task.task_id]===undefined?<div style={{color:'#9CA3AF',fontSize:13}}>Loading…</div>:
               actMap[task.task_id].length===0?<div style={{color:'#9CA3AF',fontSize:13}}>No activity logged.</div>:(
                <div style={{maxHeight:180,overflowY:'auto'}}>
                  {actMap[task.task_id].map((a,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',borderBottom:'1px solid #F9FAFB',fontSize:13}}>
                      <span style={{color:'#9CA3AF',minWidth:52,fontSize:12}}>{fmtTime(a.timestamp)}</span>
                      <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:a.idle_flag?'#F59E0B':'#6B7280'}}/>
                      <span style={{flex:1,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.application_name}</span>
                      <span style={{color:'#9CA3AF',fontSize:12}}>{fmtDur(a.duration)}</span>
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
const SEL = { padding:'8px 12px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, background:'#fff', outline:'none', cursor:'pointer' };
