import React, { useState, useEffect } from 'react';

const pad = n => String(Math.max(0,n)).padStart(2,'0');
const fmtDur = s => { s=Math.max(0,Math.floor(s||0)); if(!s)return'—'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h>0?`${h}h ${m}m`:m>0?`${m}m ${sec}s`:`${sec}s`; };
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—';
const CAT_C = {work:'#2563EB',neutral:'#6B7280','non-work':'#DC2626',idle:'#F59E0B'};

function ScoreChip({score}){if(score==null)return null;const s=Math.round(score);const c=s>=80?'#16A34A':s>=60?'#D97706':'#DC2626';const bg=s>=80?'#F0FDF4':s>=60?'#FFFBEB':'#FEF2F2';return<span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:bg,color:c}}>{s}%</span>;}

export default function TaskHistory({ refreshSig, userId }) {
  const [tasks,  setTasks]  = useState([]);
  const [loading,setLoading]= useState(true);
  const [date,   setDate]   = useState(new Date().toISOString().split('T')[0]);
  const [exp,    setExp]    = useState(null);
  const [actMap, setActMap] = useState({});
  const api = window.worktrack;

  useEffect(() => {
    let gone = false;
    setLoading(true);
    const run = async () => {
      try {
        const data = await api?.getTasks(date) ?? [];
        if (!gone) setTasks(Array.isArray(data)?data:[]);
      } catch { if (!gone) setTasks([]); }
      if (!gone) setLoading(false);
    };
    run();
    return () => { gone = true; };
  }, [refreshSig, date]); // refreshSig drives reload

  async function expand(taskId) {
    if (exp === taskId) { setExp(null); return; }
    setExp(taskId);
    if (!actMap[taskId] && api) {
      try { const a = await api.getActivity(taskId); setActMap(m=>({...m,[taskId]:Array.isArray(a)?a:[]})); }
      catch { setActMap(m=>({...m,[taskId]:[]})); }
    }
  }

  const done = tasks.filter(t=>t.end_time);

  return (
    <div style={{padding:14}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <input type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={e=>setDate(e.target.value)}
          style={{padding:'7px 10px',border:'1px solid #E5E7EB',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
        <span style={{fontSize:12,color:'#9CA3AF'}}>{done.length} task{done.length!==1?'s':''}</span>
      </div>

      {loading && <div style={{padding:40,textAlign:'center',color:'#9CA3AF',fontSize:13}}>Loading…</div>}

      {!loading && done.length===0 && (
        <div style={{padding:'30px 0',textAlign:'center',color:'#9CA3AF',fontSize:13}}>
          No completed tasks for {date===new Date().toISOString().split('T')[0]?'today':date}.<br/>
          <span style={{fontSize:11,display:'block',marginTop:4}}>Complete a task in the Timer tab.</span>
        </div>
      )}

      {!loading && done.map(task=>(
        <div key={task.task_id} style={{border:'1px solid #E5E7EB',borderRadius:10,marginBottom:8,background:'#fff',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 13px',cursor:'pointer'}} onClick={()=>expand(task.task_id)}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{task.task_name}</div>
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>{fmtTime(task.start_time)} → {fmtTime(task.end_time)} · {fmtDur(task.total_duration)}</div>
            </div>
            <ScoreChip score={task.productivity_score}/>
            <span style={{fontSize:11,color:'#9CA3AF'}}>{exp===task.task_id?'▲':'▼'}</span>
          </div>
          {exp===task.task_id&&(
            <div style={{borderTop:'1px solid #F3F4F6',padding:'11px 13px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                {[{l:'Total',v:fmtDur(task.total_duration),c:'#374151'},{l:'Active',v:fmtDur(task.active_duration),c:'#16A34A'},{l:'Idle',v:fmtDur(task.idle_duration),c:'#D97706'}].map(x=>(
                  <div key={x.l} style={{background:'#F9FAFB',borderRadius:6,padding:'8px 10px',textAlign:'center'}}>
                    <div style={{fontSize:10,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'.04em'}}>{x.l}</div>
                    <div style={{fontSize:14,fontWeight:600,color:x.c,marginTop:2}}>{x.v}</div>
                  </div>
                ))}
              </div>
              {actMap[task.task_id]===undefined?<div style={{fontSize:12,color:'#9CA3AF'}}>Loading…</div>:
               actMap[task.task_id].length===0?<div style={{fontSize:12,color:'#9CA3AF'}}>No activity records.</div>:(
                <div style={{maxHeight:160,overflowY:'auto'}}>
                  {actMap[task.task_id].map((a,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0',borderBottom:'1px solid #F9FAFB',fontSize:12}}>
                      <span style={{color:'#9CA3AF',minWidth:48,fontSize:11}}>{fmtTime(a.timestamp)}</span>
                      <div style={{width:6,height:6,borderRadius:'50%',flexShrink:0,background:a.idle_flag?'#F59E0B':CAT_C[a.category]||'#6B7280'}}/>
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
