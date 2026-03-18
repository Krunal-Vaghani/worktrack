import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [userId,   setUserId]   = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) { setError('Enter your User ID and password.'); return; }
    setError(''); setLoading(true);
    try {
      const api = window.worktrack;
      const res = api
        ? await api.login(userId.trim(), password.trim())
        : { success: true, user: { user_id: 'demo', name: 'Demo', role: 'employee' } };
      if (res.success) onLogin(res.user);
      else setError(res.error || 'Invalid User ID or password.');
    } catch { setError('Could not connect. Try again.'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F3F4F6' }}>
      <div style={{ width:340, background:'#fff', borderRadius:16, padding:32, border:'1px solid #E5E7EB', boxShadow:'0 4px 24px rgba(0,0,0,.07)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'#2563EB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'#fff', margin:'0 auto 12px' }}>WT</div>
          <div style={{ fontSize:20, fontWeight:600, color:'#111827' }}>WorkTrack</div>
          <div style={{ fontSize:13, color:'#6B7280', marginTop:4 }}>Sign in to continue</div>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={S.lbl}>User ID</label>
            <input style={S.inp} value={userId} onChange={e => { setUserId(e.target.value); setError(''); }} placeholder="e.g. admin or JaneSmith" autoFocus autoComplete="username" spellCheck="false" autoCapitalize="off" />
            <div style={{fontSize:11,color:'#9CA3AF',marginTop:3}}>Case-sensitive — enter exactly as set by admin</div>
          </div>
          <div>
            <label style={S.lbl}>Password</label>
            <input style={S.inp} type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="••••••••" autoComplete="current-password" />
          </div>
          {error && <div style={{ padding:'10px 12px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, color:'#DC2626', fontSize:13 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding:12, borderRadius:8, border:'none', background:loading?'#93C5FD':'#2563EB', color:'#fff', fontSize:14, fontWeight:600, cursor:loading?'not-allowed':'pointer' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
const S = {
  lbl: { fontSize:12, fontWeight:500, color:'#374151', display:'block', marginBottom:5 },
  inp: { width:'100%', padding:'10px 12px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:14, outline:'none', fontFamily:'inherit', color:'#111827', boxSizing:'border-box' },
};
