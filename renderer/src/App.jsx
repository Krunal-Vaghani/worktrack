import React, { useState, useEffect, useCallback } from 'react';
import Login        from './components/Login.jsx';
import EmployeeShell from './components/EmployeeShell.jsx';
import AdminShell   from './components/AdminShell.jsx';

export default function App() {
  const [auth, setAuth] = useState(null); // null=loading, false=logged-out, user object=logged-in

  useEffect(() => {
    const api = window.worktrack;
    if (!api) { setAuth({ user_id:'demo', name:'Demo', role:'employee' }); return; }
    api.authCheck().then(r => { setAuth(r?.loggedIn ? r.user : false); });
  }, []);

  const handleLogin  = useCallback(user => setAuth(user), []);
  const handleLogout = useCallback(async () => { await window.worktrack?.logout(); setAuth(false); }, []);

  if (auth === null) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F3F4F6'}}>
      <div style={{color:'#6B7280',fontSize:13}}>Loading…</div>
    </div>
  );

  if (!auth) return <Login onLogin={handleLogin} />;
  if (auth.role === 'admin') return <AdminShell user={auth} onLogout={handleLogout} />;
  return <EmployeeShell user={auth} onLogout={handleLogout} />;
}
