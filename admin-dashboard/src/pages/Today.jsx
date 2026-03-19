import React, { useState, useEffect } from 'react';
import api from '../hooks/useApi.js';

const fmtDur  = s => { s=Math.max(0,Math.floor(s||0)); if(!s)return'—'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; };
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—';
const ScoreChip = ({score}) => { if(score==null)return null; const s=Math.round(score); const c=s>=80?'#16A34A':s>=60?'#D97706':'#DC2626'; const bg=s>=80?'#F0FDF4':s>=60?'#FFFBEB':'#FEF2F2'; return <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:bg,color:c}}>{s}%</span>; };

export default function Today() {
  const [employees, setEmployees] = useState([]);
  const [selEmp,    setSelEmp]    = useState('all');
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { api.get('/employees').then(e=>setEmployees(Array.isArray(e)?e:[])).catch(()=>{}); }, []);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      const params = new URLSearchParams({ date: today });
      if (selEmp !== 'all') params.set('userId', selEmp);
      api.get(`/tasks?${params}&limit=200`)
        .then(data => { setTasks((Array.isArray(data)?data:[]).filter(t=>t.end_time)); setLoading(false); })
        .catch(() => { setTasks([]); setLoading(false); });
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [selEmp]);

  const totalActive = tasks.reduce((s,t)=>s+(t.active_duration||0),0);
  const totalIdle   = tasks.reduce((s,t)=>s+(t.idle_duration||0),0);
  const avgScore    = tasks.length ? Math.round(tasks.reduce((s,t)=>s+(t.productivity_score||0),0)/tasks.length) : 0;
  const dayLabel    = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  return (
    <div style={{padding:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:600,color:'#111827'}}>Today</h1>
          <p style={{fontSize:13,color:'#6B7280',marginTop:2}}>{dayLabel} · auto-refreshes every 30s</p>
        </div>
        <select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={SEL}>
          <option value="all">All employees</option>
          {employees.map(e=><option key={e.user_id} value={e.user_id}>{e.name}</option>)}
        </select>
      </div>

      {tasks.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Tasks done',v:tasks.length,c:'#111827'},{l:'Avg score',v:`${avgScore}%`,c:avgScore>=80?'#16A34A':avgScore>=60?'#D97706':'#DC2626'},{l:'Active time',v:fmtDur(totalActive),c:'#2563EB'},{l:'Idle time',v:fmtDur(totalIdle),c:'#D97706'}].map(x=>(
            <div key={x.l} style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:12,color:'#6B7280',marginBottom:4}}>{x.l}</div>
              <div style={{fontSize:22,fontWeight:600,color:x.c}}>{x.v}</div>
            </div>
          ))}
        </div>
      )}

      {loading&&<div style={{color:'#9CA3AF',fontSize:13}}>Loading…</div>}
      {!loading&&tasks.length===0&&(
        <div style={{padding:'40px 0',textAlign:'center',color:'#9CA3AF'}}>
          <div style={{fontSize:32,marginBottom:8}}>📊</div>
          <div style={{fontSize:14}}>No completed tasks today yet.</div>
          <div style={{fontSize:12,marginTop:4}}>Data appears as employees complete tasks.</div>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,overflow:'hidden'}}>
        {tasks.map((t,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:i<tasks.length-1?'1px solid #F3F4F6':'none',fontSize:13}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.task_name}</div>
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>{t.user_name||''} · {fmtTime(t.start_time)}–{fmtTime(t.end_time)} · {fmtDur(t.total_duration)}</div>
            </div>
            <ScoreChip score={t.productivity_score}/>
          </div>
        ))}
      </div>
    </div>
  );
}
const SEL = { padding:'8px 12px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, background:'#fff', outline:'none', cursor:'pointer' };
