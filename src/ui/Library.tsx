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
          <button 
            key={m.meta.id}
            onClick={() => set((s) => ({ project: { ...s.project, tracks: s.project.tracks.map((t, i) => i===0 ? { ...t, module: m.meta.id, params: { ...m.defaultParams } } : t) } }))}
            style={{
              textAlign: 'left', 
              padding: '10px 12px', 
              background: active === m.meta.id 
                ? 'linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%)' 
                : 'linear-gradient(135deg, #2a2a2e 0%, #1a1a1e 100%)',
              border: active === m.meta.id 
                ? '2px solid #60a5fa' 
                : '1px solid #404040',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: active === m.meta.id 
                ? '0 4px 12px rgba(74, 158, 255, 0.3)' 
                : '0 2px 4px rgba(0, 0, 0, 0.1)',
              transform: active === m.meta.id ? 'translateY(-1px)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (active !== m.meta.id) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #3a3a3e 0%, #2a2a2e 100%)';
                e.currentTarget.style.borderColor = '#505050';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (active !== m.meta.id) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #2a2a2e 0%, #1a1a1e 100%)';
                e.currentTarget.style.borderColor = '#404040';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            <div style={{
              fontSize: 14, 
              fontWeight: 'bold',
              color: active === m.meta.id ? '#ffffff' : '#e5e7eb',
              marginBottom: 2
            }}>
              {m.meta.name}
            </div>
            <div style={{
              fontSize: 11, 
              opacity: active === m.meta.id ? 0.9 : 0.6,
              color: active === m.meta.id ? '#ffffff' : '#9ca3af',
              fontFamily: 'monospace'
            }}>
              {m.meta.id}
            </div>
          </button>
        ))}
      </div>
      <div style={{opacity:0.7, fontSize:12, marginTop:12}}>Transitions & Post (coming soon)</div>
    </div>
  );
};
