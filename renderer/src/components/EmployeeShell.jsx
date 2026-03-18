import React, { useState, useEffect, useCallback } from 'react';
import TaskTimer    from './TaskTimer.jsx';
import TaskHistory  from './TaskHistory.jsx';
import DailySummary from './DailySummary.jsx';
import EmployeeSettings from './EmployeeSettings.jsx';

const TABS = [
  {id:'timer',    label:'Timer',   icon:'⏱'},
  {id:'history',  label:'History', icon:'📋'},
  {id:'today',    label:'Today',   icon:'📊'},
  {id:'settings', label:'Settings',icon:'⚙️'},
];

export default function EmployeeShell({ user, onLogout }) {
  const [tab, setTab]               = useState('timer');
  const [syncStatus, setSyncStatus] = useState({ isConnected:false, pendingCount:0 });
  const [refreshSig, setRefreshSig] = useState(0);
  const api = window.worktrack;

  const refresh = useCallback(() => setRefreshSig(s => s + 1), []);

  useEffect(() => {
    if (!api) return;
    api.getSyncStatus?.().then(setSyncStatus).catch(()=>{});
    const iv  = setInterval(() => api.getSyncStatus?.().then(setSyncStatus).catch(()=>{}), 30000);
    // task-stopped comes from main process (stop button OR start-another)
    const u1  = api.onTaskStopped?.(() => refresh());
    return () => { clearInterval(iv); u1?.(); };
  }, [refresh, api]);

  const goTab = useCallback((id) => {
    setTab(id);
    // Always refresh when switching to data tabs
    if (id === 'history' || id === 'today') refresh();
  }, [refresh]);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh'}}>
      {/* Title bar */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 14px',height:44,background:'#1D4ED8',flexShrink:0,WebkitAppRegion:'drag'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:24,height:24,borderRadius:6,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff'}}>WT</div>
          <span style={{color:'#fff',fontWeight:600,fontSize:13}}>WorkTrack</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,WebkitAppRegion:'no-drag'}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:syncStatus.isConnected?'#4ADE80':'#FCA5A5'}} title={syncStatus.isConnected?'Synced':'Offline'}/>
          <span style={{color:'rgba(255,255,255,.85)',fontSize:12}}>{user.name}</span>
          <button onClick={onLogout} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.3)',background:'transparent',color:'rgba(255,255,255,.85)',fontSize:11,cursor:'pointer'}}>
            Sign out
          </button>
        </div>
      </div>

      {/* Content — all tabs stay mounted */}
      <div style={{flex:1,overflow:'hidden',background:'#F9FAFB'}}>
        <div style={{display:tab==='timer'   ?'flex':'none',flexDirection:'column',height:'100%',overflowY:'auto'}}>
          <TaskTimer onTaskStopped={refresh} />
        </div>
        <div style={{display:tab==='history' ?'block':'none',height:'100%',overflowY:'auto'}}>
          <TaskHistory refreshSig={refreshSig} userId={user.user_id} />
        </div>
        <div style={{display:tab==='today'   ?'block':'none',height:'100%',overflowY:'auto'}}>
          <DailySummary refreshSig={refreshSig} userId={user.user_id} />
        </div>
        <div style={{display:tab==='settings'?'block':'none',height:'100%',overflowY:'auto'}}>
          <EmployeeSettings />
        </div>
      </div>

      {/* Bottom nav */}
      <nav style={{display:'flex',borderTop:'1px solid #E5E7EB',background:'#fff',flexShrink:0}}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>goTab(t.id)} style={{flex:1,padding:'8px 0',border:'none',background:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,color:tab===t.id?'#2563EB':'#6B7280',borderTop:tab===t.id?'2px solid #2563EB':'2px solid transparent'}}>
            <span style={{fontSize:16}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:tab===t.id?600:400}}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
