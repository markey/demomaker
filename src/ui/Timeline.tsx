import React from 'react';
import { useProjectStore } from '../state/projectStore';

export const Timeline: React.FC = () => {
  const meta = useProjectStore((s) => s.project.meta);
  const t = useProjectStore((s) => s.transport.time);
  const width = 1000;
  return (
    <div style={{padding:'8px 12px', borderTop:'1px solid #222'}}>
      <div style={{fontSize:12, opacity:0.75}}>Timeline • {meta.duration.toFixed(1)}s @ {meta.fps}fps • t={t.toFixed(2)}</div>
      <div style={{height:40, background:'#0b0b0c', border:'1px solid #222', marginTop:6, position:'relative', overflow:'hidden'}}>
        <div style={{position:'absolute', left: `${(t / meta.duration) * 100}%`, top:0, bottom:0, width:2, background:'#e54d2e'}} />
        <div style={{width, height:'100%'}} />
      </div>
    </div>
  );
};

