import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const fmtDur = s => { s=Math.max(0,Math.floor(s||0)); if(!s)return'0m'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; };

export default function DailySummary({ refreshSig, userId }) {
  const [summary, setSummary] = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const api = window.worktrack;

  useEffect(() => {
    let gone = false;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const run = async () => {
      try {
        const [s, t] = await Promise.all([
          api ? api.getDailySummary()    : Promise.resolve({}),
          api ? api.getTasks(today)      : Promise.resolve([])
        ]);
        if (!gone) {
          setSummary(s||{});
          setTasks(Array.isArray(t)?t.filter(tk=>tk.end_time):[]);
        }
      } catch { if(!gone){setSummary({});setTasks([]);} }
      if (!gone) setLoading(false);
    };
    run();
    return () => { gone = true; };
  }, [refreshSig]); // refreshSig drives reload

  const tc  = Number(summary?.task_count   || tasks.length || 0);
  const tot = Number(summary?.total_seconds || 0);
  const act = Number(summary?.active_seconds|| 0);
  const idl = Number(summary?.idle_seconds  || 0);
  const avg = Number(summary?.avg_score     || 0);

  const pieData = [{name:'Active',value:act,color:'#2563EB'},{name:'Idle',value:idl,color:'#F59E0B'}].filter(d=>d.value>0);
  const barData = tasks.slice(0,8).map(t=>({name:(t.task_name||'').slice(0,16)+(t.task_name?.length>16?'…':''),minutes:Math.round((t.active_duration||0)/60)}));
  const today   = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#9CA3AF',fontSize:13}}>Loading…</div>;

  return (
    <div style={{padding:14,display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontSize:14,fontWeight:600,color:'#111827'}}>{today}</div>

      {tc===0 ? (
        <div style={{padding:'30px 0',textAlign:'center',color:'#9CA3AF',fontSize:13}}>
          No completed tasks today.<br/><span style={{fontSize:11,display:'block',marginTop:4}}>Complete a task in the Timer tab.</span>
        </div>
      ) : (
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              {label:'Tasks done',  value:tc,             color:'#111827'},
              {label:'Avg score',   value:`${Math.round(avg)}%`, color:avg>=80?'#16A34A':avg>=60?'#D97706':'#DC2626'},
              {label:'Active time', value:fmtDur(act),    color:'#2563EB'},
              {label:'Idle time',   value:fmtDur(idl),    color:'#D97706'},
            ].map(c=>(
              <div key={c.label} style={{background:'#F9FAFB',borderRadius:8,padding:'11px 13px'}}>
                <div style={{fontSize:11,color:'#6B7280',marginBottom:3}}>{c.label}</div>
                <div style={{fontSize:22,fontWeight:600,color:c.color}}>{c.value}</div>
              </div>
            ))}
          </div>

          {pieData.length>0&&tot>0&&(
            <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:14}}>
              <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Time breakdown</div>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <ResponsiveContainer width={90} height={90}>
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={24} outerRadius={42} dataKey="value" strokeWidth={0}>
                    {pieData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {pieData.map(d=>(
                    <div key={d.name} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
                      <div style={{width:10,height:10,borderRadius:2,background:d.color}}/>
                      <span style={{fontWeight:500}}>{d.name}</span>
                      <span style={{color:'#6B7280'}}>{fmtDur(d.value)}</span>
                      <span style={{color:'#9CA3AF',fontSize:11}}>({tot>0?Math.round((d.value/tot)*100):0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {barData.length>0&&(
            <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:14}}>
              <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Active time per task (min)</div>
              <ResponsiveContainer width="100%" height={Math.max(barData.length*28,50)}>
                <BarChart data={barData} layout="vertical" margin={{left:0,right:24,top:0,bottom:0}}>
                  <XAxis type="number" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'#374151'}} axisLine={false} tickLine={false} width={95}/>
                  <Tooltip formatter={v=>[`${v} min`,'Active']} contentStyle={{fontSize:12,borderRadius:6}}/>
                  <Bar dataKey="minutes" fill="#2563EB" radius={[0,3,3,0]} barSize={12}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:14}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Completed tasks</div>
            {tasks.map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #F9FAFB',fontSize:13}}>
                <div style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:500}}>{t.task_name}</div>
                <span style={{color:'#9CA3AF',fontSize:11,flexShrink:0}}>{fmtDur(t.total_duration)}</span>
                {t.productivity_score!=null&&(
                  <span style={{fontSize:11,fontWeight:600,padding:'1px 7px',borderRadius:20,flexShrink:0,background:t.productivity_score>=80?'#F0FDF4':t.productivity_score>=60?'#FFFBEB':'#FEF2F2',color:t.productivity_score>=80?'#16A34A':t.productivity_score>=60?'#D97706':'#DC2626'}}>
                    {Math.round(t.productivity_score)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
