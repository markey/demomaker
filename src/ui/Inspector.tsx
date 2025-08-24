import React from 'react';
import { useProjectStore } from '../state/projectStore';

export const Inspector: React.FC = () => {
  const track = useProjectStore((s) => s.project.tracks[0]);
  const set = useProjectStore.setState;
  return (
    <div style={{padding:12}}>
      <h3 style={{margin:'8px 0'}}>Inspector</h3>
      <div style={{fontSize:12, opacity:0.8}}>Track: {track?.module}</div>
      {track && (
        <div style={{marginTop:12}}>
          <label style={{display:'block', fontSize:12, opacity:0.8}}>Morph</label>
          <input type="range" min={0} max={1} step={0.01} value={track.params.morph ?? 0} onChange={(e) => {
            const morph = parseFloat(e.target.value);
            set((s) => ({ project: { ...s.project, tracks: s.project.tracks.map(t => t.id===track.id? { ...t, params: { ...t.params, morph } } : t) } }));
          }} />
          <div style={{marginTop:8}}>
            <label style={{display:'inline-flex', alignItems:'center', gap:8}}>
              <input type="checkbox" checked={!!track.params.autoRotate} onChange={(e) => set((s) => ({ project: { ...s.project, tracks: s.project.tracks.map(t => t.id===track.id? { ...t, params: { ...t.params, autoRotate: e.target.checked } } : t) } }))} />
              Auto rotate
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

