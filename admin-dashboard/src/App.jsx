/**
 * Admin web dashboard — same tabs as EXE admin:
 * History | Today | Employees | Settings
 */
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import History    from './pages/History.jsx';
import Today      from './pages/Today.jsx';
import Employees  from './pages/Employees.jsx';
import Settings   from './pages/Settings.jsx';
import Login      from './pages/Login.jsx';

function RequireAuth({ children }) {
  return localStorage.getItem('wt_token') ? children : <Navigate to="/login" replace />;
}

const NAV = [
  { to:'/history',   label:'History',   icon:'📋' },
  { to:'/today',     label:'Today',     icon:'📊' },
  { to:'/employees', label:'Employees', icon:'👥' },
  { to:'/settings',  label:'Settings',  icon:'⚙' },
];

function Layout({ children }) {
  const navigate      = useNavigate();
  const { pathname }  = useLocation();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const check = () => fetch('/api/health').then(()=>setOnline(true)).catch(()=>setOnline(false));
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      <aside style={{ width:210, background:'#111827', display:'flex', flexDirection:'column', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ padding:'18px 16px 16px', borderBottom:'1px solid #1F2937' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'#2563EB', color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>WT</div>
              <div>
                <p style={{ fontSize:14, fontWeight:600, color:'#fff', margin:0 }}>WorkTrack</p>
                <p style={{ fontSize:11, color:'#6B7280', margin:0 }}>Admin Dashboard</p>
              </div>
            </div>
            {/* Server status */}
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:6, background:'rgba(255,255,255,.05)' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:online?'#22C55E':'#EF4444', boxShadow:online?'0 0 6px #22C55E':'none' }}/>
              <span style={{ fontSize:11, color:online?'#86EFAC':'#FCA5A5', fontWeight:500 }}>{online?'Server online':'Server offline'}</span>
            </div>
          </div>
          <nav style={{ padding:'12px 8px', display:'flex', flexDirection:'column', gap:2 }}>
            {NAV.map(item => (
              <Link key={item.to} to={item.to} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, color: pathname.startsWith(item.to)?'#fff':'#9CA3AF', background: pathname.startsWith(item.to)?'#1F2937':'transparent', textDecoration:'none', fontSize:14, fontWeight: pathname.startsWith(item.to)?500:400 }}>
                <span style={{ fontSize:16 }}>{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
        </div>
        <button onClick={() => { localStorage.removeItem('wt_token'); navigate('/login'); }}
          style={{ margin:'0 8px 16px', padding:'9px 12px', borderRadius:8, border:'none', background:'transparent', color:'#6B7280', fontSize:13, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
          ⏻ Sign out
        </button>
      </aside>
      <main style={{ flex:1, overflowY:'auto', background:'#F9FAFB' }}>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <RequireAuth>
          <Layout>
            <Routes>
              <Route path="/"          element={<Navigate to="/history" replace />} />
              <Route path="/history"   element={<History />} />
              <Route path="/today"     element={<Today />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/settings"  element={<Settings />} />
            </Routes>
          </Layout>
        </RequireAuth>
      } />
    </Routes>
  );
}
