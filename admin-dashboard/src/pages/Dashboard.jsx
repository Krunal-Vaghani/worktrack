import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../hooks/useApi.js';

// ── Mock data (replaced by real API when server is running) ──────────────────
const MOCK = {
  metrics: { avgProductivity: 84, totalActiveHours: 47.2, totalIdleHours: 4.1, tasksCompleted: 42, employees: 6 },
  weeklyTrend: [
    { day:'Mon', active:38, idle:4 }, { day:'Tue', active:42, idle:3 },
    { day:'Wed', active:45, idle:5 }, { day:'Thu', active:40, idle:4 },
    { day:'Fri', active:44, idle:3 }, { day:'Sat', active:12, idle:1 },
    { day:'Sun', active:0,  idle:0 },
  ],
  appUsage: [
    { name:'VS Code', value:38, color:'#6D28D9' }, { name:'Chrome',  value:21, color:'#D97706' },
    { name:'Slack',   value:12, color:'#059669' }, { name:'Figma',   value:10, color:'#2563EB' },
    { name:'Notion',  value:9,  color:'#374151' }, { name:'Other',   value:10, color:'#9CA3AF' },
  ],
  topEmployees: [
    { name:'Dev Patel',     score:93, hours:7.2, tasks:9 },
    { name:'Alice Chen',    score:91, hours:7.0, tasks:8 },
    { name:'Bob Martinez',  score:86, hours:6.8, tasks:7 },
    { name:'Leo Zhang',     score:84, hours:6.5, tasks:6 },
    { name:'Sara Kim',      score:76, hours:5.4, tasks:5 },
    { name:'Mia Torres',    score:68, hours:4.2, tasks:4 },
  ],
  recentTasks: [
    { employee:'Dev Patel',    task:'Implement OAuth2 flow',          duration:'1h 24m', score:96, time:'11:42 AM' },
    { employee:'Alice Chen',   task:'Refactor Redux store to Zustand', duration:'2h 05m', score:91, time:'11:30 AM' },
    { employee:'Bob Martinez', task:'Write payment module tests',      duration:'1h 40m', score:88, time:'10:55 AM' },
    { employee:'Leo Zhang',    task:'Design system token update',      duration:'0h 55m', score:84, time:'10:30 AM' },
    { employee:'Sara Kim',     task:'Code review – auth PRs',          duration:'1h 10m', score:79, time:'09:45 AM' },
  ],
};

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={S.metCard}>
      <p style={S.metLabel}>{label}</p>
      <p style={{ ...S.metValue, color: color || '#111827' }}>{value}</p>
      {sub && <p style={S.metSub}>{sub}</p>}
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 85 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626';
  return (
    <div style={S.scoreWrap}>
      <div style={{ ...S.scoreBar, width: `${score}%`, background: color }} />
      <span style={{ ...S.scoreVal, color }}>{score}%</span>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]         = useState(MOCK);
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard?range=${dateRange}`)
      .then(setData)
      .catch(() => setData(MOCK))   // fallback to mock if server not running
      .finally(() => setLoading(false));
  }, [dateRange]);

  const { metrics, weeklyTrend, appUsage, topEmployees, recentTasks } = data;

  return (
    <div style={S.page}>
      {/* Page header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.h1}>Dashboard</h1>
          <p style={S.sub}>{new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        </div>
        <div style={S.headerRight}>
          <select style={S.select} value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
          <button style={S.exportBtn} onClick={() => api.get('/reports/export?format=csv').catch(() => alert('Start the server first'))}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div style={S.metGrid}>
        <MetricCard label="Avg Productivity"  value={`${metrics.avgProductivity}%`} color="#16A34A" sub="+3% vs yesterday" />
        <MetricCard label="Active Hours"       value={`${metrics.totalActiveHours}h`} sub={`${metrics.employees} employees`} />
        <MetricCard label="Idle Time"          value={`${metrics.totalIdleHours}h`}   color="#D97706" sub={`${Math.round(metrics.totalIdleHours/(metrics.totalActiveHours+metrics.totalIdleHours)*100)}% of total`} />
        <MetricCard label="Tasks Completed"    value={metrics.tasksCompleted} sub={`Avg ${(metrics.tasksCompleted/metrics.employees).toFixed(1)} per person`} />
      </div>

      {/* Weekly trend + App usage */}
      <div style={S.row2}>
        <div style={S.card}>
          <h3 style={S.cardTitle}>Weekly activity (hours)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyTrend} barSize={14} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="day" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius:8, border:'1px solid #E5E7EB', fontSize:12 }} />
              <Bar dataKey="active" name="Active" fill="#2563EB" radius={[3,3,0,0]} />
              <Bar dataKey="idle"   name="Idle"   fill="#FCA5A5" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.card}>
          <h3 style={S.cardTitle}>Application usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={appUsage} dataKey="value" nameKey="name" cx="42%" cy="50%"
                innerRadius={55} outerRadius={85} paddingAngle={2}>
                {appUsage.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }} />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius:8, fontSize:12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Productivity trend line */}
      <div style={S.card}>
        <h3 style={S.cardTitle}>Productivity trend — this week</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={weeklyTrend.map((d,i) => ({ ...d, score: [82,85,88,84,87,91,0][i] }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis dataKey="day" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis domain={[60,100]} tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius:8, fontSize:12 }} />
            <Line type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2} dot={{ fill:'#2563EB', r:3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Employee leaderboard + Recent tasks */}
      <div style={S.row2}>
        <div style={S.card}>
          <h3 style={S.cardTitle}>Employee productivity</h3>
          <table style={S.table}>
            <thead>
              <tr>
                {['Employee','Score','Hours','Tasks'].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topEmployees.map((emp, i) => (
                <tr key={i} style={S.tr}>
                  <td style={S.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ ...S.avatar, background: ['#EDE9FE','#DBEAFE','#ECFDF5','#FEF3C7','#FCE7F3','#FEF2F2'][i] }}>
                        {emp.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      {emp.name}
                    </div>
                  </td>
                  <td style={S.td}><ScoreBar score={emp.score} /></td>
                  <td style={{ ...S.td, textAlign:'right' }}>{emp.hours}h</td>
                  <td style={{ ...S.td, textAlign:'right' }}>{emp.tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={S.card}>
          <h3 style={S.cardTitle}>Recent task completions</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {recentTasks.map((t, i) => (
              <div key={i} style={S.taskRow}>
                <div style={{ flex:1 }}>
                  <p style={S.taskName}>{t.task}</p>
                  <p style={S.taskMeta}>{t.employee} · {t.time} · {t.duration}</p>
                </div>
                <span style={{ ...S.scorePill, background: t.score>=85?'#F0FDF4':t.score>=70?'#FFFBEB':'#FEF2F2', color: t.score>=85?'#16A34A':t.score>=70?'#D97706':'#DC2626' }}>
                  {t.score}%
                </span>
              </div>
            ))}
          </div>
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
  exportBtn:  { padding:'8px 16px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, background:'#fff', cursor:'pointer', color:'#374151' },
  metGrid:    { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  metCard:    { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'16px 18px' },
  metLabel:   { fontSize:12, color:'#6B7280', marginBottom:6 },
  metValue:   { fontSize:26, fontWeight:600, lineHeight:1 },
  metSub:     { fontSize:12, color:'#9CA3AF', marginTop:4 },
  row2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 },
  card:       { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'18px 20px', marginBottom:16 },
  cardTitle:  { fontSize:14, fontWeight:500, color:'#111827', marginBottom:14 },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { fontSize:11, fontWeight:500, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.04em', padding:'0 0 10px', textAlign:'left' },
  tr:         { borderTop:'1px solid #F3F4F6' },
  td:         { padding:'10px 0', fontSize:13, color:'#374151' },
  avatar:     { width:26, height:26, borderRadius:'50%', fontSize:10, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', color:'#374151' },
  scoreWrap:  { display:'flex', alignItems:'center', gap:8 },
  scoreBar:   { height:6, borderRadius:3, flex:1 },
  scoreVal:   { fontSize:12, fontWeight:500, minWidth:32 },
  taskRow:    { display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid #F3F4F6' },
  taskName:   { fontSize:13, fontWeight:500, color:'#111827' },
  taskMeta:   { fontSize:11, color:'#9CA3AF', marginTop:2 },
  scorePill:  { padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:500, flexShrink:0 },
};
