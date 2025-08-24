import React from 'react';
import { useProjectStore } from '../state/projectStore';
import { getEffect } from '../plugins/PluginManager';

export const Inspector: React.FC = () => {
  const track = useProjectStore((s) => s.project.tracks[0]);
  const set = useProjectStore.setState;
  const mod = track ? getEffect(track.module) : undefined;

  function setParam(key: string, value: any) {
    set((s) => ({ project: { ...s.project, tracks: s.project.tracks.map(t => t.id===track!.id? { ...t, params: { ...t.params, [key]: value } } : t) } }));
  }

  function renderControl([key, value]: [string, any]) {
    if (typeof value === 'number') {
      const lower = key.toLowerCase();
      const is01 = ['morph'].some(k => lower.includes(k));
      const isPalette = lower.includes('palette');
      const min = isPalette ? 0 : is01 ? 0 : lower.includes('scale') ? 0.1 : lower.includes('grid') ? 2 : 0;
      const max = isPalette ? 2 : is01 ? 1 : lower.includes('grid') ? 256 : lower.includes('pointsize') ? 0.2 : 10;
      const step = isPalette || lower.includes('grid') ? 1 : 0.01;
      return (
        <div key={key} style={{marginBottom:8}}>
          <label style={{display:'block', fontSize:12, opacity:0.8}}>{key}</label>
          <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => setParam(key, Number(e.target.value))} />
          <div style={{fontSize:11, opacity:0.7}}>{Number(value).toFixed(3)}</div>
        </div>
      );
    }
    if (typeof value === 'boolean') {
      return (
        <div key={key} style={{marginBottom:8}}>
          <label style={{display:'inline-flex', alignItems:'center', gap:8}}>
            <input type="checkbox" checked={value} onChange={(e) => setParam(key, e.target.checked)} />
            {key}
          </label>
        </div>
      );
    }
    if (typeof value === 'string') {
      return (
        <div key={key} style={{marginBottom:8}}>
          <label style={{display:'block', fontSize:12, opacity:0.8}}>{key}</label>
          <input value={value} onChange={(e) => setParam(key, e.target.value)} />
        </div>
      );
    }
    return null;
  }

  return (
    <div style={{padding:12}}>
      <h3 style={{margin:'8px 0'}}>Inspector</h3>
      {track ? (
        <>
          <div style={{fontSize:12, opacity:0.8}}>Track: {mod?.meta.name ?? track.module}</div>
          <div style={{marginTop:12}}>
            {Object.entries(track.params).map(renderControl)}
          </div>
        </>
      ) : (
        <div style={{fontSize:12, opacity:0.7}}>No active track</div>
      )}
    </div>
  );
};
