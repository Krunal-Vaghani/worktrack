import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../hooks/useApi.js';

function fmtDur(s){if(!s)return'0m';const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`;}
function MetricCard({label,value,sub,color}){return(<div style={S.metCard}><p style={S.metLabel}>{label}</p><p style={{...S.metValue,color:color||'#111827'}}>{value}</p>{sub&&<p style={S.metSub}>{sub}</p>}</div>);}
function ScoreBar({score}){const color=score>=85?'#16A34A':score>=70?'#D97706':'#DC2626';return(<div style={S.scoreWrap}><div style={{...S.scoreBar,width:`${score}%`,background:color}}/><span style={{...S.scoreVal,color}}>{score}%</span></div>);}

const COLORS = ['#6D28D9','#D97706','#059669','#2563EB','#374151','#9CA3AF'];

export default function Dashboard() {
  const [data,      setData]      = useState(null);
  const [range,     setRange]     = useState('today');
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard?range=${range}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  const m  = data?.metrics      || {};
  const trend = data?.weeklyTrend  || [];
  const apps  = data?.appUsage     || [];
  const emps  = data?.topEmployees || [];
  const recent= data?.recentTasks  || [];

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.h1}>Dashboard</h1>
          <p style={S.sub}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        <select style={S.select} value={range} onChange={e=>setRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
      </div>

      {loading && <div style={{color:'#9CA3AF',fontSize:13,padding:'20px 0'}}>Loading…</div>}

      {!loading && !data && (
        <div style={{background:'#FEF3C7',border:'1px solid #FDE68A',borderRadius:10,padding:16,marginBottom:20,fontSize:13,color:'#92400E'}}>
          No data yet. Add employees and have them install the WorkTrack desktop app, then data will appear here as they work.
        </div>
      )}

      {!loading && (
        <>
          <div style={S.metGrid}>
            <MetricCard label="Avg Productivity"  value={m.avgProductivity?`${m.avgProductivity}%`:'—'} color="#16A34A" sub="Completed tasks"/>
            <MetricCard label="Active Hours"       value={m.totalActiveHours?`${m.totalActiveHours}h`:'—'} sub={m.employees?`${m.employees} employees`:'No employees yet'}/>
            <MetricCard label="Idle Time"          value={m.totalIdleHours?`${m.totalIdleHours}h`:'—'} color="#D97706"/>
            <MetricCard label="Tasks Completed"    value={m.tasksCompleted||0}/>
          </div>

          {trend.length > 0 && (
            <div style={S.row2}>
              <div style={S.card}>
                <h3 style={S.cardTitle}>Daily activity (hours)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trend} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6"/>
                    <XAxis dataKey="day" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{borderRadius:8,border:'1px solid #E5E7EB',fontSize:12}}/>
                    <Bar dataKey="active" name="Active" fill="#2563EB" radius={[3,3,0,0]}/>
                    <Bar dataKey="idle"   name="Idle"   fill="#FCA5A5" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {apps.length > 0 && (
                <div style={S.card}>
                  <h3 style={S.cardTitle}>Application usage</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={apps} dataKey="value" nameKey="name" cx="42%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {apps.map((e,i)=><Cell key={i} fill={e.color||COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:12}}/>
                      <Tooltip formatter={v=>`${v}%`} contentStyle={{borderRadius:8,fontSize:12}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {emps.length > 0 && (
            <div style={S.row2}>
              <div style={S.card}>
                <h3 style={S.cardTitle}>Employee productivity</h3>
                <table style={S.table}>
                  <thead><tr>{['Employee','Score','Hours','Tasks'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {emps.map((e,i)=>(
                      <tr key={i} style={S.tr}>
                        <td style={S.td}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{...S.avatar,background:['#EDE9FE','#DBEAFE','#ECFDF5','#FEF3C7'][i%4]}}>{e.name?.[0]}</div>{e.name}</div></td>
                        <td style={S.td}><ScoreBar score={Math.round(e.score||0)}/></td>
                        <td style={{...S.td,textAlign:'right'}}>{e.hours||0}h</td>
                        <td style={{...S.td,textAlign:'right'}}>{e.tasks||0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {recent.length > 0 && (
                <div style={S.card}>
                  <h3 style={S.cardTitle}>Recent tasks</h3>
                  {recent.map((t,i)=>(
                    <div key={i} style={S.taskRow}>
                      <div style={{flex:1}}>
                        <p style={S.taskName}>{t.task}</p>
                        <p style={S.taskMeta}>{t.employee} · {t.time} · {t.duration}</p>
                      </div>
                      <span style={{fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:20,background:t.score>=85?'#F0FDF4':t.score>=70?'#FFFBEB':'#FEF2F2',color:t.score>=85?'#16A34A':t.score>=70?'#D97706':'#DC2626'}}>
                        {t.score}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!data && !loading && (
            <div style={{...S.card,textAlign:'center',padding:40,color:'#9CA3AF'}}>
              <div style={{fontSize:32,marginBottom:12}}>📊</div>
              <div style={{fontSize:15,fontWeight:500,color:'#374151',marginBottom:8}}>No activity data yet</div>
              <div style={{fontSize:13}}>Employees need to install the WorkTrack desktop app and connect to this server.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const S = {
  page:{padding:28,maxWidth:1280,margin:'0 auto'},
  pageHeader:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24},
  h1:{fontSize:22,fontWeight:600,color:'#111827'},
  sub:{fontSize:13,color:'#6B7280',marginTop:2},
  select:{padding:'8px 12px',border:'1px solid #E5E7EB',borderRadius:8,fontSize:13,background:'#fff',cursor:'pointer'},
  metGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20},
  metCard:{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:'16px 18px'},
  metLabel:{fontSize:12,color:'#6B7280',marginBottom:6},
  metValue:{fontSize:26,fontWeight:600,lineHeight:1},
  metSub:{fontSize:12,color:'#9CA3AF',marginTop:4},
  row2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16},
  card:{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:'18px 20px',marginBottom:16},
  cardTitle:{fontSize:14,fontWeight:500,color:'#111827',marginBottom:14},
  table:{width:'100%',borderCollapse:'collapse'},
  th:{fontSize:11,fontWeight:500,color:'#6B7280',textTransform:'uppercase',letterSpacing:'.04em',padding:'0 0 10px',textAlign:'left'},
  tr:{borderTop:'1px solid #F3F4F6'},
  td:{padding:'10px 0',fontSize:13,color:'#374151'},
  avatar:{width:26,height:26,borderRadius:'50%',fontSize:11,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',color:'#374151'},
  scoreWrap:{display:'flex',alignItems:'center',gap:8},
  scoreBar:{height:6,borderRadius:3,flex:1},
  scoreVal:{fontSize:12,fontWeight:500,minWidth:32},
  taskRow:{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #F3F4F6'},
  taskName:{fontSize:13,fontWeight:500,color:'#111827'},
  taskMeta:{fontSize:11,color:'#9CA3AF',marginTop:2},
};
