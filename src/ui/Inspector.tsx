import React from 'react';
import { useProjectStore } from '../state/projectStore';
import { getEffect } from '../plugins/PluginManager';

export const Inspector: React.FC = () => {
  const selectedTrackId = useProjectStore((s) => s.selectedTrackId);
  const playbackMode = useProjectStore((s) => s.transport.playbackMode);
  const track = useProjectStore((s) => s.project.tracks.find(t => t.id === selectedTrackId));
  const set = useProjectStore.setState;
  const mod = track ? getEffect(track.module) : undefined;

  function setParam(key: string, value: any) {
    // Disable parameter editing during playback
    if (playbackMode === 'playback') return;
    
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
          <input 
            type="range" 
            min={min} 
            max={max} 
            step={step} 
            value={value} 
            onChange={(e) => setParam(key, Number(e.target.value))}
            disabled={playbackMode === 'playback'}
            style={{
              opacity: playbackMode === 'playback' ? 0.5 : 1,
              cursor: playbackMode === 'playback' ? 'not-allowed' : 'pointer'
            }}
          />
          <div style={{fontSize:11, opacity:0.7}}>{Number(value).toFixed(3)}</div>
        </div>
      );
    }
    if (typeof value === 'boolean') {
      return (
        <div key={key} style={{marginBottom:8}}>
          <label style={{display:'inline-flex', alignItems:'center', gap:8}}>
            <input 
              type="checkbox" 
              checked={value} 
              onChange={(e) => setParam(key, e.target.checked)}
              disabled={playbackMode === 'playback'}
              style={{
                opacity: playbackMode === 'playback' ? 0.5 : 1,
                cursor: playbackMode === 'playback' ? 'not-allowed' : 'pointer'
              }}
            />
            {key}
          </label>
        </div>
      );
    }
    if (typeof value === 'string') {
      return (
        <div key={key} style={{marginBottom:8}}>
          <label style={{display:'block', fontSize:12, opacity:0.8}}>{key}</label>
          <input 
            value={value} 
            onChange={(e) => setParam(key, e.target.value)}
            disabled={playbackMode === 'playback'}
            style={{
              opacity: playbackMode === 'playback' ? 0.5 : 1,
              cursor: playbackMode === 'playback' ? 'not-allowed' : 'pointer'
            }}
          />
        </div>
      );
    }
    return null;
  }

  return (
    <div style={{padding:12}}>
      <h3 style={{margin:'8px 0'}}>Inspector</h3>
      
      {/* Mode indicator */}
      <div style={{
        display: 'inline-block',
        marginBottom: 12,
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: '3px',
        background: playbackMode === 'playback' ? '#4a9eff' : '#666',
        color: '#fff',
        fontWeight: 'bold',
        textTransform: 'uppercase'
      }}>
        {playbackMode === 'playback' ? '▶️ Playback Mode' : '✏️ Edit Mode'}
      </div>
      
      {track ? (
        <>
          <div style={{fontSize:12, opacity:0.8}}>Track: {mod?.meta.name ?? track.module}</div>
          <div style={{marginTop:12}}>
            {Object.entries(track.params).map(renderControl)}
          </div>
          {playbackMode === 'playback' && (
            <div style={{
              marginTop: 12,
              padding: '8px',
              background: 'rgba(74, 158, 255, 0.1)',
              border: '1px solid rgba(74, 158, 255, 0.3)',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#4a9eff'
            }}>
              Parameters are read-only during playback
            </div>
          )}
        </>
      ) : (
        <div style={{fontSize:12, opacity:0.7}}>
          {playbackMode === 'playback' 
            ? 'No active effect to inspect' 
            : 'Select a track to edit parameters'
          }
        </div>
      )}
    </div>
  );
};
