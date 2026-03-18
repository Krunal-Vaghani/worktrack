import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import Dashboard   from './pages/Dashboard.jsx';
import Employees   from './pages/Employees.jsx';
import Reports     from './pages/Reports.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import Login       from './pages/Login.jsx';

function RequireAuth({ children }) {
  const token = localStorage.getItem('wt_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',  icon: '▦' },
  { to: '/employees', label: 'Employees',  icon: '👥' },
  { to: '/reports',   label: 'Reports',    icon: '📈' },
  { to: '/settings',  label: 'Settings',   icon: '⚙' },
];

function Layout({ children }) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  const logout = () => {
    localStorage.removeItem('wt_token');
    navigate('/login');
  };

  return (
    <div style={S.shell}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sideTop}>
          <div style={S.brand}>
            <div style={S.brandIcon}>WT</div>
            <div>
              <p style={S.brandName}>WorkTrack</p>
              <p style={S.brandSub}>Admin</p>
            </div>
          </div>
          <nav style={S.navList}>
            {NAV_ITEMS.map(item => (
              <Link key={item.to} to={item.to}
                style={{ ...S.navItem, ...(pathname === item.to ? S.navItemActive : {}) }}>
                <span style={S.navIcon}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <button onClick={logout} style={S.logoutBtn}>⏻ Sign out</button>
      </aside>

      {/* Main content */}
      <main style={S.main}>{children}</main>
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
              <Route path="/"          element={<Dashboard />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/reports"   element={<Reports />} />
              <Route path="/settings"  element={<SettingsPage />} />
            </Routes>
          </Layout>
        </RequireAuth>
      } />
    </Routes>
  );
}

const S = {
  shell:        { display:'flex', height:'100vh', overflow:'hidden' },
  sidebar:      { width:220, background:'#111827', display:'flex', flexDirection:'column', justifyContent:'space-between', flexShrink:0 },
  sideTop:      { padding:'20px 0' },
  brand:        { display:'flex', alignItems:'center', gap:10, padding:'0 16px 20px', borderBottom:'1px solid #1F2937' },
  brandIcon:    { width:32, height:32, borderRadius:8, background:'#2563EB', color:'#fff', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center' },
  brandName:    { fontSize:14, fontWeight:600, color:'#fff' },
  brandSub:     { fontSize:11, color:'#6B7280' },
  navList:      { padding:'16px 8px', display:'flex', flexDirection:'column', gap:2 },
  navItem:      { display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, color:'#9CA3AF', textDecoration:'none', fontSize:14, transition:'all .15s' },
  navItemActive:{ background:'#1F2937', color:'#fff' },
  navIcon:      { fontSize:16, width:20, textAlign:'center' },
  logoutBtn:    { margin:'0 8px 16px', padding:'9px 12px', borderRadius:8, border:'none', background:'transparent', color:'#6B7280', fontSize:13, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8 },
  main:         { flex:1, overflowY:'auto', background:'#F9FAFB' },
};
