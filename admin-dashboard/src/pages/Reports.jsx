import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../hooks/useApi.js';

function fmtDur(s) { if(!s)return'—'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; }
function ScoreChip({score}){ if(score==null)return null; const s=Math.round(score); const c=s>=80?'#16A34A':s>=60?'#D97706':'#DC2626'; const bg=s>=80?'#F0FDF4':s>=60?'#FFFBEB':'#FEF2F2'; return <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:bg,color:c}}>{s}%</span>; }

export default function Reports() {
  const [tasks,     setTasks]     = useState([]);
  const [summary,   setSummary]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [range,     setRange]     = useState('week');
  const [empFilter, setEmpFilter] = useState('all');
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ from: getFrom(range) });
    if (empFilter !== 'all') params.set('userId', empFilter);

    Promise.all([
      api.get(`/tasks?${params}&limit=200`).catch(()=>[]),
      api.get(`/tasks/summary?${params}`).catch(()=>[]),
      api.get('/employees').catch(()=>[]),
    ]).then(([t, s, e]) => {
      setTasks(Array.isArray(t)?t:[]);
      setSummary(Array.isArray(s)?s:[]);
      setEmployees(Array.isArray(e)?e:[]);
      setLoading(false);
    });
  }, [range, empFilter]);

  function getFrom(r) {
    const d = new Date();
    if (r==='today') d.setHours(0,0,0,0);
    else if (r==='week') d.setDate(d.getDate()-6);
    else d.setDate(1);
    return d.toISOString();
  }

  async function doExport(fmt) {
    setExporting(fmt);
    const params = new URLSearchParams({ from: getFrom(range) });
    if (empFilter !== 'all') params.set('userId', empFilter);
    try {
      const token = localStorage.getItem('wt_token');
      const res = await fetch(`/api/reports/${fmt}?${params}`, { headers:{ Authorization:`Bearer ${token}` } });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `worktrack_report.${fmt==='excel'?'xlsx':fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed'); }
    setExporting('');
  }

  const totalTasks  = summary.reduce((s,e)=>s+(e.task_count||0),0);
  const totalHours  = (summary.reduce((s,e)=>s+(Number(e.active_seconds)||0),0)/3600).toFixed(1);
  const avgScore    = summary.length ? Math.round(summary.reduce((s,e)=>s+(Number(e.avg_score)||0),0)/summary.length) : 0;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div><h1 style={S.h1}>Reports</h1><p style={S.sub}>Productivity analytics and exports</p></div>
        <div style={{display:'flex',gap:8}}>
          <select style={S.sel} value={range} onChange={e=>setRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
          <select style={S.sel} value={empFilter} onChange={e=>setEmpFilter(e.target.value)}>
            <option value="all">All employees</option>
            {employees.map(e=><option key={e.user_id} value={e.user_id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {/* Metrics */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {[{l:'Total tasks',v:totalTasks},{l:'Active hours',v:`${totalHours}h`},{l:'Avg score',v:`${avgScore}%`,c:avgScore>=80?'#16A34A':avgScore>=60?'#D97706':'#DC2626'}].map(c=>(
          <div key={c.l} style={S.metCard}>
            <div style={S.metLabel}>{c.l}</div>
            <div style={{...S.metVal,color:c.c||'#111827'}}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* Employee comparison */}
      {summary.length > 0 && (
        <div style={{...S.card,marginBottom:16}}>
          <div style={S.cardTitle}>Employee comparison</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{color:'#6B7280'}}>
              {['Employee','Tasks','Active','Idle','Score'].map(h=><th key={h} style={{textAlign:'left',padding:'0 0 10px',fontSize:11,fontWeight:500,textTransform:'uppercase',letterSpacing:'.04em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {summary.map((e,i)=>(
                <tr key={i} style={{borderTop:'1px solid #F3F4F6'}}>
                  <td style={{padding:'10px 0',fontWeight:500}}>{e.name}</td>
                  <td style={{padding:'10px 0'}}>{e.task_count||0}</td>
                  <td style={{padding:'10px 0'}}>{fmtDur(e.active_seconds)}</td>
                  <td style={{padding:'10px 0',color:'#D97706'}}>{fmtDur(e.idle_seconds)}</td>
                  <td style={{padding:'10px 0'}}><ScoreChip score={e.avg_score}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task list */}
      <div style={{...S.card,marginBottom:16}}>
        <div style={S.cardTitle}>Task completions {loading&&<span style={{fontSize:12,color:'#9CA3AF',fontWeight:400}}>Loading…</span>}</div>
        {!loading && tasks.length === 0 && <div style={{color:'#9CA3AF',fontSize:13}}>No tasks for this period.</div>}
        {tasks.filter(t=>t.end_time).slice(0,50).map((t,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid #F3F4F6',fontSize:13}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:500}}>{t.task_name}</div>
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>{t.user_name||''} · {new Date(t.start_time).toLocaleDateString()} · {fmtDur(t.total_duration)}</div>
            </div>
            <ScoreChip score={t.productivity_score}/>
          </div>
        ))}
      </div>

      {/* Exports */}
      <div style={S.card}>
        <div style={S.cardTitle}>Export</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          {[{fmt:'csv',icon:'📄',label:'CSV'},{fmt:'excel',icon:'📊',label:'Excel'},{fmt:'pdf',icon:'📋',label:'PDF'}].map(({fmt,icon,label})=>(
            <button key={fmt} onClick={()=>doExport(fmt)} disabled={!!exporting}
              style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:4,padding:'14px 18px',border:'1px solid #E5E7EB',borderRadius:10,background:'#fff',cursor:'pointer',opacity:exporting===fmt?.7:1}}>
              <span style={{fontSize:24}}>{icon}</span>
              <span style={{fontSize:13,fontWeight:600}}>{exporting===fmt?'Downloading…':`Download ${label}`}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  page:      { padding:28 },
  header:    { display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20 },
  h1:        { fontSize:22,fontWeight:600,color:'#111827' },
  sub:       { fontSize:13,color:'#6B7280',marginTop:2 },
  sel:       { padding:'8px 12px',border:'1px solid #E5E7EB',borderRadius:8,fontSize:13,background:'#fff',cursor:'pointer' },
  metCard:   { background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:'16px 18px' },
  metLabel:  { fontSize:12,color:'#6B7280',marginBottom:6 },
  metVal:    { fontSize:24,fontWeight:600 },
  card:      { background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:'18px 20px' },
  cardTitle: { fontSize:14,fontWeight:500,color:'#111827',marginBottom:14 },
};
