import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';

const MOCK_DAILY = [
  { date:'Mon 13', tasks:8, active:6.2, idle:0.5, score:90 },
  { date:'Tue 14', tasks:7, active:5.8, idle:0.8, score:85 },
  { date:'Wed 15', tasks:9, active:7.1, idle:0.4, score:92 },
  { date:'Thu 16', tasks:6, active:5.0, idle:1.2, score:79 },
  { date:'Fri 17', tasks:8, active:6.5, idle:0.6, score:88 },
];

const MOCK_EMPLOYEES = [
  { name:'Dev Patel',    tasks:42, hours:35.2, idle:2.1, score:93 },
  { name:'Alice Chen',   tasks:38, hours:33.5, idle:2.8, score:91 },
  { name:'Bob Martinez', tasks:35, hours:31.0, idle:3.2, score:86 },
  { name:'Leo Zhang',    tasks:30, hours:28.4, idle:3.8, score:84 },
  { name:'Sara Kim',     tasks:25, hours:24.1, idle:4.5, score:76 },
  { name:'Mia Torres',   tasks:20, hours:19.8, idle:5.1, score:68 },
];

function fmt(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ScoreChip({ score }) {
  const bg    = score >= 85 ? '#F0FDF4' : score >= 70 ? '#FFFBEB' : '#FEF2F2';
  const color = score >= 85 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626';
  return <span style={{ padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:600, background:bg, color }}>{score}%</span>;
}

export default function Reports() {
  const [range,    setRange]    = useState('week');
  const [employee, setEmployee] = useState('all');
  const [exporting, setExporting] = useState('');

  async function doExport(format) {
    setExporting(format);
    try {
      const params = new URLSearchParams({ range, ...(employee !== 'all' && { userId: employee }) });
      const res = await fetch(`/api/reports/${format}?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('wt_token')}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `worktrack_report.${format === 'excel' ? 'xlsx' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Server not running. Start the admin-server first.');
    } finally {
      setExporting('');
    }
  }

  const totalTasks  = MOCK_EMPLOYEES.reduce((s, e) => s + e.tasks, 0);
  const totalHours  = MOCK_EMPLOYEES.reduce((s, e) => s + e.hours, 0).toFixed(1);
  const avgScore    = Math.round(MOCK_EMPLOYEES.reduce((s, e) => s + e.score, 0) / MOCK_EMPLOYEES.length);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.h1}>Reports</h1>
          <p style={S.sub}>Productivity analytics and data exports</p>
        </div>
        <div style={S.headerRight}>
          <select style={S.select} value={range} onChange={e => setRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
          <select style={S.select} value={employee} onChange={e => setEmployee(e.target.value)}>
            <option value="all">All employees</option>
            {MOCK_EMPLOYEES.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary metrics */}
      <div style={S.metGrid}>
        {[
          { label:'Total tasks',      value: totalTasks },
          { label:'Total hours',      value: `${totalHours}h` },
          { label:'Avg productivity', value: `${avgScore}%`,   color:'#16A34A' },
          { label:'Employees tracked',value: MOCK_EMPLOYEES.length },
        ].map(c => (
          <div key={c.label} style={S.metCard}>
            <p style={S.metLabel}>{c.label}</p>
            <p style={{ ...S.metVal, color: c.color || '#111827' }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={S.row2}>
        <div style={S.card}>
          <h3 style={S.cardTitle}>Daily tasks completed</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MOCK_DAILY} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius:8, border:'1px solid #E5E7EB', fontSize:12 }} />
              <Bar dataKey="tasks" name="Tasks" fill="#2563EB" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.card}>
          <h3 style={S.cardTitle}>Daily productivity score</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={MOCK_DAILY}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis domain={[60,100]} tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => `${v}%`} contentStyle={{ borderRadius:8, border:'1px solid #E5E7EB', fontSize:12 }} />
              <Line type="monotone" dataKey="score" stroke="#16A34A" strokeWidth={2.5} dot={{ r:4, fill:'#16A34A' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employee comparison table */}
      <div style={{ ...S.card, marginBottom:20 }}>
        <h3 style={S.cardTitle}>Employee comparison</h3>
        <table style={S.table}>
          <thead>
            <tr>
              {['Employee','Tasks','Active hours','Idle time','Avg score'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_EMPLOYEES.map((emp, i) => (
              <tr key={i} style={{ borderTop:'1px solid #F3F4F6' }}>
                <td style={S.td}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ ...S.avatar, background:['#EDE9FE','#DBEAFE','#ECFDF5','#FEF3C7','#FCE7F3','#FEF2F2'][i] }}>
                      {emp.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    {emp.name}
                  </div>
                </td>
                <td style={S.td}>{emp.tasks}</td>
                <td style={S.td}>{emp.hours}h</td>
                <td style={{ ...S.td, color:'#D97706' }}>{emp.idle}h</td>
                <td style={S.td}><ScoreChip score={emp.score} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export section */}
      <div style={S.card}>
        <h3 style={S.cardTitle}>Export report</h3>
        <p style={{ fontSize:13, color:'#6B7280', marginBottom:16 }}>
          Download the filtered data in your preferred format.
        </p>
        <div style={S.exportRow}>
          {[
            { fmt:'csv',   icon:'📄', label:'CSV',   desc:'Plain text, opens in any spreadsheet' },
            { fmt:'excel', icon:'📊', label:'Excel',  desc:'Formatted .xlsx with colored headers' },
            { fmt:'pdf',   icon:'📋', label:'PDF',    desc:'Printable report with summary stats' },
          ].map(({ fmt, icon, label, desc }) => (
            <button
              key={fmt}
              style={{ ...S.exportCard, opacity: exporting === fmt ? 0.7 : 1 }}
              onClick={() => doExport(fmt)}
              disabled={!!exporting}
            >
              <span style={{ fontSize:28 }}>{icon}</span>
              <span style={{ fontSize:14, fontWeight:600 }}>{exporting===fmt ? 'Downloading…' : `Download ${label}`}</span>
              <span style={{ fontSize:12, color:'#9CA3AF' }}>{desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  page:       { padding:28, maxWidth:1280, margin:'0 auto' },
  pageHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 },
  h1:         { fontSize:22, fontWeight:600, color:'#111827' },
  sub:        { fontSize:13, color:'#6B7280', marginTop:2 },
  headerRight:{ display:'flex', gap:8 },
  select:     { padding:'8px 12px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, background:'#fff', color:'#374151', cursor:'pointer' },
  metGrid:    { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  metCard:    { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'16px 18px' },
  metLabel:   { fontSize:12, color:'#6B7280', marginBottom:6 },
  metVal:     { fontSize:26, fontWeight:600, lineHeight:1 },
  row2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 },
  card:       { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'18px 20px' },
  cardTitle:  { fontSize:14, fontWeight:500, color:'#111827', marginBottom:14 },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { fontSize:11, fontWeight:500, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.04em', padding:'0 0 10px', textAlign:'left' },
  td:         { padding:'10px 0', fontSize:13, color:'#374151' },
  avatar:     { width:26, height:26, borderRadius:'50%', fontSize:10, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', color:'#374151', flexShrink:0 },
  exportRow:  { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 },
  exportCard: { display:'flex', flexDirection:'column', gap:6, alignItems:'flex-start', padding:'16px 18px', border:'1px solid #E5E7EB', borderRadius:10, background:'#fff', cursor:'pointer', textAlign:'left', transition:'border-color .15s, background .15s' },
};
