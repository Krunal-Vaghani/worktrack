/**
 * TaskTimer.jsx
 * Core timer. Score fix: uses server value directly; only falls back to 100
 * if score is missing. Does NOT recalculate (that caused the 0% bug).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

const pad = n => String(Math.max(0,n)).padStart(2,'0');
const fmtClock = s => { s=Math.max(0,Math.floor(s||0)); return `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`; };
const fmtDur   = s => { s=Math.max(0,Math.floor(s||0)); if(!s)return'0s'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h>0?`${h}h ${m}m`:m>0?`${m}m ${sec}s`:`${sec}s`; };

const CAT = { work:{c:'#2563EB',bg:'#EFF6FF',l:'Work'}, neutral:{c:'#6B7280',bg:'#F3F4F6',l:'Neutral'}, 'non-work':{c:'#DC2626',bg:'#FEF2F2',l:'Non-work'}, idle:{c:'#F59E0B',bg:'#FFFBEB',l:'Idle'} };

export default function TaskTimer({ onTaskStopped }) {
  const [taskName,   setTaskName]   = useState('');
  const [isRunning,  setIsRunning]  = useState(false);
  const [elapsed,    setElapsed]    = useState(0);
  const [startEpoch, setStartEpoch] = useState(null);
  const [activeWin,  setActiveWin]  = useState(null);
  const [isIdle,     setIsIdle]     = useState(false);
  const [log,        setLog]        = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [error,      setError]      = useState('');
  const [busy,       setBusy]       = useState(false);

  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const logEnd   = useRef(null);
  const api      = window.worktrack;

  // Restore task if running (e.g. after app restart)
  useEffect(() => {
    api?.getState().then(st => {
      if (st?.currentTask) {
        const start = new Date(st.currentTask.start_time).getTime();
        setTaskName(st.currentTask.task_name);
        setStartEpoch(start);
        setIsRunning(true);
        setSummary(null);
      }
    });
  }, []);

  // Wall-clock timer — stays accurate even while tab is hidden
  useEffect(() => {
    if (isRunning && startEpoch) {
      const tick = () => setElapsed(Math.floor((Date.now()-startEpoch)/1000));
      tick();
      timerRef.current = setInterval(tick, 500);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isRunning, startEpoch]);

  // IPC events
  useEffect(() => {
    if (!api) return;
    const u1 = api.onActiveWindowChanged(info => {
      setActiveWin(info);
      const cat = info.category || 'neutral';
      setLog(prev => [...prev.slice(-99), {
        id: Date.now(),
        time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
        app: info.appName, title: info.windowTitle, cat,
      }]);
      setTimeout(() => logEnd.current?.scrollIntoView({behavior:'smooth'}), 50);
    });
    const u2 = api.onIdleStatusChanged(({isIdle:idle}) => setIsIdle(idle));
    return () => { u1?.(); u2?.(); };
  }, [api]);

  const handleStart = useCallback(async () => {
    const name = taskName.trim();
    if (!name) { setError('Enter a task description'); inputRef.current?.focus(); return; }
    setError(''); setBusy(true);
    const now = Date.now();
    if (api) {
      const res = await api.startTask(name);
      if (!res.success) { setError(res.error || 'Failed to start'); setBusy(false); return; }
    }
    setSummary(null); setLog([]); setElapsed(0);
    setStartEpoch(now); setIsIdle(false); setActiveWin(null); setIsRunning(true);
    setBusy(false);
  }, [taskName, api]);

  const handleStop = useCallback(async () => {
    setBusy(true); setIsRunning(false); clearInterval(timerRef.current);
    const finalSec = Math.floor((Date.now()-(startEpoch||Date.now()))/1000);
    if (api) {
      const res = await api.stopTask();
      if (res.success && res.summary) {
        const s = res.summary;
        const total  = Number(s.totalDuration)  || finalSec;
        const active = Number(s.activeDuration) >= 0 ? Number(s.activeDuration) : total;
        const idle   = Number(s.idleDuration)   || 0;
        // Use server score directly — it already handles the no-activity=100% case
        const score  = s.productivityScore != null ? Number(s.productivityScore) : 100;
        setSummary({ total, active, idle, score: Math.min(100,Math.max(0,score)), apps: s.appBreakdown||[] });
      } else {
        setSummary({ total:finalSec, active:finalSec, idle:0, score:100, apps:[] });
      }
    } else {
      setSummary({ total:finalSec, active:finalSec, idle:0, score:100, apps:[] });
    }
    setBusy(false);
    onTaskStopped?.();  // tell shells to refresh history/today
  }, [api, startEpoch, onTaskStopped]);

  useEffect(() => {
    const h = e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') isRunning?handleStop():handleStart(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [isRunning, handleStart, handleStop]);

  const scoreColor = s => s>=80?'#16A34A':s>=60?'#D97706':'#DC2626';
  const scoreBg    = s => s>=80?'#F0FDF4':s>=60?'#FFFBEB':'#FEF2F2';

  return (
    <div style={{ padding:14, display:'flex', flexDirection:'column', gap:12 }}>
      {/* Task input */}
      <div>
        <div style={L}>Current task</div>
        <input ref={inputRef}
          style={{ width:'100%', padding:'10px 12px', border:`1.5px solid ${error?'#DC2626':isRunning?'#BFDBFE':'#E5E7EB'}`, borderRadius:8, fontSize:14, fontWeight:500, outline:'none', fontFamily:'inherit', background:isRunning?'#EFF6FF':'#fff', boxSizing:'border-box' }}
          value={taskName} onChange={e=>{setTaskName(e.target.value);setError('');}}
          placeholder="What are you working on?" disabled={isRunning} maxLength={120}
          onKeyDown={e=>e.key==='Enter'&&!isRunning&&handleStart()} />
        {error && <p style={{fontSize:12,color:'#DC2626',marginTop:4}}>{error}</p>}
      </div>

      {/* Clock */}
      <div style={{ textAlign:'center', padding:'18px 0 12px', borderRadius:10, background:isIdle?'#FFFBEB':isRunning?'#EFF6FF':'#F9FAFB' }}>
        <div style={{ fontFamily:'monospace', fontSize:44, fontWeight:600, letterSpacing:'0.04em', color:isIdle?'#D97706':isRunning?'#2563EB':'#374151' }}>
          {fmtClock(elapsed)}
        </div>
        {isRunning && (
          <div style={{marginTop:8}}>
            {isIdle
              ? <span style={{fontSize:12,fontWeight:500,padding:'3px 12px',borderRadius:20,background:'#FFFBEB',color:'#D97706'}}>⏸ Idle</span>
              : <span style={{fontSize:12,fontWeight:500,padding:'3px 12px',borderRadius:20,background:'#F0FDF4',color:'#16A34A'}}>● Active</span>
            }
          </div>
        )}
      </div>

      {/* Button */}
      <button disabled={busy}
        style={{ width:'100%', padding:13, borderRadius:8, fontSize:14, fontWeight:600, cursor:busy?'not-allowed':'pointer', border:isRunning?'1.5px solid #FECACA':'none', background:busy?'#9CA3AF':isRunning?'#FEF2F2':'#2563EB', color:isRunning?'#DC2626':'#fff' }}
        onClick={isRunning?handleStop:handleStart}>
        {busy?'…':isRunning?'⏹  Stop Task':'▶  Start Task'}
      </button>
      <p style={{textAlign:'center',fontSize:11,color:'#9CA3AF',marginTop:-6}}>Ctrl+Enter to {isRunning?'stop':'start'}</p>

      {/* Active window */}
      {isRunning && (
        <div style={{background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:8,padding:12}}>
          <div style={L}>Active window</div>
          {activeWin ? (
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:CAT[activeWin.category]?.c||'#9CA3AF',flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeWin.appName}</div>
                {activeWin.windowTitle&&activeWin.windowTitle!==activeWin.appName&&(
                  <div style={{fontSize:11,color:'#6B7280',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeWin.windowTitle.slice(0,70)}</div>
                )}
              </div>
              <span style={{fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:4,flexShrink:0,background:CAT[activeWin.category]?.bg||'#F3F4F6',color:CAT[activeWin.category]?.c||'#6B7280'}}>
                {CAT[activeWin.category]?.l||'Neutral'}
              </span>
            </div>
          ) : <div style={{fontSize:12,color:'#9CA3AF',marginTop:4}}>Waiting for activity…</div>}
        </div>
      )}

      {/* Activity log */}
      {isRunning && log.length > 0 && (
        <div style={{border:'1px solid #E5E7EB',borderRadius:8,padding:12}}>
          <div style={L}>Activity log</div>
          <div style={{maxHeight:120,overflowY:'auto',marginTop:6}}>
            {log.map(e=>(
              <div key={e.id} style={{display:'flex',alignItems:'center',gap:7,padding:'3px 0',borderBottom:'1px solid #F3F4F6',fontSize:12}}>
                <span style={{color:'#9CA3AF',minWidth:64,fontVariantNumeric:'tabular-nums',fontSize:11}}>{e.time}</span>
                <div style={{width:6,height:6,borderRadius:'50%',background:CAT[e.cat]?.c||'#9CA3AF',flexShrink:0}}/>
                <span style={{fontWeight:500,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.app}</span>
                <span style={{fontSize:11,fontWeight:500,padding:'1px 6px',borderRadius:3,background:CAT[e.cat]?.bg||'#F3F4F6',color:CAT[e.cat]?.c||'#6B7280'}}>{CAT[e.cat]?.l||'Neutral'}</span>
              </div>
            ))}
            <div ref={logEnd}/>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && !isRunning && (
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:12,padding:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:14,fontWeight:600}}>Task complete — {taskName}</span>
            <span style={{fontSize:12,fontWeight:600,padding:'3px 10px',borderRadius:20,background:scoreBg(summary.score),color:scoreColor(summary.score)}}>
              {Math.round(summary.score)}% productive
            </span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
            {[{l:'Total',v:fmtDur(summary.total),c:'#374151'},{l:'Active',v:fmtDur(summary.active),c:'#16A34A'},{l:'Idle',v:fmtDur(summary.idle),c:'#D97706'}].map(x=>(
              <div key={x.l} style={{background:'#fff',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
                <div style={{fontSize:11,color:'#6B7280'}}>{x.l}</div>
                <div style={{fontSize:15,fontWeight:600,color:x.c,marginTop:3}}>{x.v}</div>
              </div>
            ))}
          </div>
          {summary.apps?.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{...L,marginBottom:6}}>Apps used</div>
              {summary.apps.slice(0,5).map((a,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,marginBottom:5}}>
                  <span style={{minWidth:80,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.app}</span>
                  <div style={{flex:1,height:6,background:'#E5E7EB',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',background:'#2563EB',borderRadius:3,minWidth:4,width:`${Math.round((a.seconds/Math.max(summary.total,1))*100)}%`}}/>
                  </div>
                  <span style={{color:'#6B7280',minWidth:40,textAlign:'right'}}>{fmtDur(a.seconds)}</span>
                </div>
              ))}
            </div>
          )}
          <button
            style={{width:'100%',padding:10,borderRadius:8,border:'1.5px solid #16A34A',background:'#fff',color:'#16A34A',fontSize:13,fontWeight:600,cursor:'pointer'}}
            onClick={()=>{setSummary(null);setTaskName('');setElapsed(0);setStartEpoch(null);inputRef.current?.focus();}}>
            + Start new task
          </button>
        </div>
      )}
    </div>
  );
}
const L = { fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', color:'#9CA3AF', marginBottom:4 };
