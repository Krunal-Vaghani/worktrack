import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE = '/api';

export default function Login() {
  const [userId,   setUserId]   = useState('admin');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId.trim(), password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('wt_token', data.token);
        navigate('/history');
      } else {
        setError(data.error || 'Invalid User ID or password');
      }
    } catch {
      setError('Could not connect to server');
    }
    setLoading(false);
  };

  return (
    <div style={S.bg}>
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoIcon}>WT</div>
          <h1 style={S.title}>WorkTrack Admin</h1>
          <p style={S.sub}>Sign in to the management dashboard</p>
        </div>
        <form onSubmit={submit} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>User ID</label>
            <input style={S.input} type="text" value={userId}
              onChange={e => { setUserId(e.target.value); setError(''); }}
              autoFocus autoComplete="username" spellCheck="false" autoCapitalize="off" />
            <span style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>Case-sensitive — same ID you use in the desktop app</span>
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••" autoComplete="current-password" />
          </div>
          {error && <p style={S.error}>{error}</p>}
          <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p style={S.hint}>Default: ID <code style={S.code}>admin</code> / Password <code style={S.code}>admin123</code></p>
      </div>
    </div>
  );
}

const S = {
  bg:       { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F9FAFB' },
  card:     { width:380, background:'#fff', borderRadius:16, padding:32, border:'1px solid #E5E7EB', boxShadow:'0 4px 24px rgba(0,0,0,.06)' },
  logo:     { textAlign:'center', marginBottom:28 },
  logoIcon: { width:48, height:48, borderRadius:12, background:'#2563EB', color:'#fff', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' },
  title:    { fontSize:20, fontWeight:600, color:'#111827' },
  sub:      { fontSize:13, color:'#6B7280', marginTop:4 },
  form:     { display:'flex', flexDirection:'column', gap:14 },
  field:    { display:'flex', flexDirection:'column', gap:5 },
  label:    { fontSize:12, fontWeight:500, color:'#374151' },
  input:    { padding:'10px 12px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:14, outline:'none', color:'#111827' },
  error:    { padding:'10px 12px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, color:'#DC2626', fontSize:13 },
  btn:      { padding:'11px', borderRadius:8, border:'none', background:'#2563EB', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer' },
  hint:     { textAlign:'center', marginTop:20, fontSize:12, color:'#9CA3AF' },
  code:     { background:'#F3F4F6', padding:'1px 6px', borderRadius:4, fontFamily:'monospace', fontSize:12, color:'#374151' },
};
