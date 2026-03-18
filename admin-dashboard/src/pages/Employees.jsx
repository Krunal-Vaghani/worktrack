import React, { useState, useEffect } from 'react';
import api from '../hooks/useApi.js';

const MOCK_EMPLOYEES = [
  { user_id:'1', name:'Dev Patel',    email:'dev@company.com',    role:'employee', device_id:'DEV-PC-001',  avg_score:93, total_hours:142, last_seen:'2 min ago',  status:'online'  },
  { user_id:'2', name:'Alice Chen',   email:'alice@company.com',  role:'employee', device_id:'ALICE-MBP',   avg_score:91, total_hours:138, last_seen:'5 min ago',  status:'online'  },
  { user_id:'3', name:'Bob Martinez', email:'bob@company.com',    role:'employee', device_id:'BOB-PC-002',  avg_score:86, total_hours:130, last_seen:'12 min ago', status:'idle'    },
  { user_id:'4', name:'Leo Zhang',    email:'leo@company.com',    role:'employee', device_id:'LEO-PC-001',  avg_score:84, total_hours:125, last_seen:'30 min ago', status:'idle'    },
  { user_id:'5', name:'Sara Kim',     email:'sara@company.com',   role:'employee', device_id:'SARA-MBP',    avg_score:76, total_hours:110, last_seen:'2 hours ago',status:'offline' },
  { user_id:'6', name:'Mia Torres',   email:'mia@company.com',    role:'employee', device_id:'MIA-PC-003',  avg_score:68, total_hours:95,  last_seen:'1 hour ago', status:'offline' },
];

const STATUS_COLORS = { online:'#16A34A', idle:'#D97706', offline:'#9CA3AF' };
const STATUS_BG     = { online:'#F0FDF4', idle:'#FFFBEB', offline:'#F9FAFB' };
const AVATARS = ['#EDE9FE','#DBEAFE','#ECFDF5','#FEF3C7','#FCE7F3','#FEF2F2'];

export default function Employees() {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [selected,  setSelected]  = useState(null);

  useEffect(() => {
    api.get('/employees').then(setEmployees).catch(() => setEmployees(MOCK_EMPLOYEES));
  }, []);

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
                        e.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || e.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>Employees</h1>
          <p style={S.sub}>{employees.length} tracked · {employees.filter(e=>e.status==='online').length} online now</p>
        </div>
        <button style={S.addBtn}>+ Add Employee</button>
      </div>

      {/* Filters */}
      <div style={S.toolbar}>
        <input style={S.search} placeholder="Search employees…" value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={S.tabs}>
          {['all','online','idle','offline'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...S.tab, ...(filter===f ? S.tabActive : {}) }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Employee grid */}
      <div style={S.grid}>
        {filtered.map((emp, i) => (
          <div key={emp.user_id} style={S.empCard} onClick={() => setSelected(emp)}>
            <div style={S.empTop}>
              <div style={{ ...S.avatar, background: AVATARS[i % AVATARS.length] }}>
                {emp.name.split(' ').map(n=>n[0]).join('')}
              </div>
              <div style={{ flex:1 }}>
                <p style={S.empName}>{emp.name}</p>
                <p style={S.empEmail}>{emp.email}</p>
              </div>
              <span style={{ ...S.statusBadge, background: STATUS_BG[emp.status], color: STATUS_COLORS[emp.status] }}>
                {emp.status}
              </span>
            </div>

            <div style={S.empStats}>
              <div style={S.stat}>
                <p style={S.statVal}>{emp.avg_score}%</p>
                <p style={S.statLabel}>Avg score</p>
              </div>
              <div style={S.stat}>
                <p style={S.statVal}>{emp.total_hours}h</p>
                <p style={S.statLabel}>Total hours</p>
              </div>
              <div style={S.stat}>
                <p style={S.statVal}>{emp.last_seen}</p>
                <p style={S.statLabel}>Last seen</p>
              </div>
            </div>

            <div style={S.scoreBarWrap}>
              <div style={{ ...S.scoreBarFill, width:`${emp.avg_score}%`, background: emp.avg_score>=85?'#16A34A':emp.avg_score>=70?'#D97706':'#DC2626' }} />
            </div>

            <p style={S.deviceId}>🖥 {emp.device_id}</p>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={S.modalOverlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div style={{ ...S.avatar, width:48, height:48, fontSize:16, background: AVATARS[employees.indexOf(selected) % AVATARS.length] }}>
                {selected.name.split(' ').map(n=>n[0]).join('')}
              </div>
              <div style={{ flex:1 }}>
                <h2 style={{ fontSize:16, fontWeight:600 }}>{selected.name}</h2>
                <p style={{ fontSize:12, color:'#6B7280' }}>{selected.email} · {selected.device_id}</p>
              </div>
              <button onClick={() => setSelected(null)} style={S.closeBtn}>✕</button>
            </div>
            <div style={S.modalBody}>
              <Row label="Role"           value={selected.role} />
              <Row label="Status"         value={<span style={{ color: STATUS_COLORS[selected.status] }}>{selected.status}</span>} />
              <Row label="Avg productivity" value={`${selected.avg_score}%`} />
              <Row label="Total hours"    value={`${selected.total_hours}h tracked`} />
              <Row label="Last seen"      value={selected.last_seen} />
            </div>
            <div style={S.modalFooter}>
              <button style={S.viewBtn} onClick={() => window.location.href=`/employees/${selected.user_id}/tasks`}>
                View Task History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #F3F4F6', fontSize:13 }}>
      <span style={{ color:'#6B7280' }}>{label}</span>
      <span style={{ fontWeight:500 }}>{value}</span>
    </div>
  );
}

const S = {
  page:       { padding:28 },
  header:     { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 },
  h1:         { fontSize:22, fontWeight:600, color:'#111827' },
  sub:        { fontSize:13, color:'#6B7280', marginTop:2 },
  addBtn:     { padding:'9px 18px', borderRadius:8, border:'none', background:'#2563EB', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' },
  toolbar:    { display:'flex', gap:12, marginBottom:20, alignItems:'center' },
  search:     { padding:'9px 12px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, width:240, outline:'none', color:'#111827' },
  tabs:       { display:'flex', gap:4 },
  tab:        { padding:'8px 14px', border:'1px solid #E5E7EB', borderRadius:8, background:'#fff', fontSize:12, color:'#6B7280', cursor:'pointer' },
  tabActive:  { background:'#EFF6FF', borderColor:'#BFDBFE', color:'#2563EB' },
  grid:       { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 },
  empCard:    { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:18, cursor:'pointer', transition:'box-shadow .15s' },
  empTop:     { display:'flex', alignItems:'center', gap:10, marginBottom:14 },
  avatar:     { width:38, height:38, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, color:'#374151', flexShrink:0 },
  empName:    { fontSize:14, fontWeight:500, color:'#111827' },
  empEmail:   { fontSize:11, color:'#9CA3AF' },
  statusBadge:{ padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:500 },
  empStats:   { display:'flex', justifyContent:'space-between', marginBottom:12 },
  stat:       { textAlign:'center' },
  statVal:    { fontSize:14, fontWeight:600, color:'#111827' },
  statLabel:  { fontSize:10, color:'#9CA3AF', marginTop:1 },
  scoreBarWrap:{ height:4, background:'#F3F4F6', borderRadius:2, overflow:'hidden', marginBottom:8 },
  scoreBarFill:{ height:'100%', borderRadius:2, transition:'width .3s' },
  deviceId:   { fontSize:11, color:'#9CA3AF' },
  // Modal
  modalOverlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modal:      { background:'#fff', borderRadius:16, width:400, boxShadow:'0 20px 60px rgba(0,0,0,.15)', overflow:'hidden' },
  modalHeader:{ display:'flex', alignItems:'center', gap:14, padding:'20px 24px', borderBottom:'1px solid #F3F4F6' },
  modalBody:  { padding:'4px 24px 8px' },
  modalFooter:{ padding:'16px 24px', borderTop:'1px solid #F3F4F6' },
  closeBtn:   { border:'none', background:'none', cursor:'pointer', fontSize:16, color:'#9CA3AF', padding:4 },
  viewBtn:    { width:'100%', padding:10, borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', color:'#374151' },
};
