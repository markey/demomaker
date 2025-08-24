import React from 'react';
import { listEffects } from '../plugins/PluginManager';
import { useProjectStore } from '../state/projectStore';

export const Library: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const set = useProjectStore.setState;
  const effects = listEffects();
  const active = project.tracks[0]?.module;
  return (
    <div style={{padding:12}}>
      <h3 style={{margin:'8px 0'}}>Library</h3>
      <div style={{opacity:0.7, fontSize:12, marginBottom:6}}>Effects</div>
      <div style={{display:'grid', gap:6}}>
        {effects.map((m) => (
          <button key={m.meta.id}
            onClick={() => set((s) => ({ project: { ...s.project, tracks: s.project.tracks.map((t, i) => i===0 ? { ...t, module: m.meta.id, params: { ...m.defaultParams } } : t) } }))}
            style={{textAlign:'left', padding:'8px', background: active===m.meta.id? '#1b1b1e' : '#101013', border:'1px solid #2a2a2e', borderRadius:6, cursor:'pointer'}}>
            <div style={{fontSize:14}}>{m.meta.name}</div>
            <div style={{fontSize:11, opacity:0.7}}>{m.meta.id}</div>
          </button>
        ))}
      </div>
      <div style={{opacity:0.7, fontSize:12, marginTop:12}}>Transitions & Post (coming soon)</div>
    </div>
  );
};
