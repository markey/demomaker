import React, { useCallback, useState } from 'react';
import { useProjectStore } from '../state/projectStore';
import type { Track } from '../state/projectStore';

export const Timeline: React.FC = () => {
  const meta = useProjectStore((s) => s.project.meta);
  const tracks = useProjectStore((s) => s.project.tracks);
  const t = useProjectStore((s) => s.transport.time);
  const selectedTrackId = useProjectStore((s) => s.selectedTrackId);
  const playbackMode = useProjectStore((s) => s.transport.playbackMode);
  const setTime = useProjectStore((s) => s.setTime);
  const addTrack = useProjectStore((s) => s.addTrack);
  const removeTrack = useProjectStore((s) => s.removeTrack);
  const selectTrack = useProjectStore((s) => s.selectTrack);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const width = 1000;
  
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Disable timeline editing during playback
    if (playbackMode === 'playback') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = (clickX / rect.width) * meta.duration;
    setTime(Math.max(0, Math.min(clickTime, meta.duration)));
    
    // Deselect any selected track when clicking on empty timeline area
    if (selectedTrackId) {
      selectTrack(null);
    }
  }, [meta.duration, setTime, selectedTrackId, selectTrack, playbackMode]);
  
  const handleTimelineMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Disable hover during playback
    if (playbackMode === 'playback') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseTime = (mouseX / rect.width) * meta.duration;
    setHoverTime(Math.max(0, Math.min(mouseTime, meta.duration)));
  }, [meta.duration, playbackMode]);
  
  const handleTimelineMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);
  
  const handleTimelineDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Disable track creation during playback
    if (playbackMode === 'playback') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = (clickX / rect.width) * meta.duration;
    
    // Add a new track at the clicked time
    const newTrack: Track = {
      id: `track_${Date.now()}`,
      kind: 'effect',
      module: '@pack/wire-morph', // Default effect
      range: [clickTime, Math.min(clickTime + 5, meta.duration)], // 5 second duration
      params: { morph: 0.0, autoRotate: true, palette: 0 }
    };
    
    addTrack(newTrack);
  }, [meta.duration, addTrack, playbackMode]);
  
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>, trackId: string) => {
    // Disable track selection during playback
    if (playbackMode === 'playback') return;
    
    e.stopPropagation();
    selectTrack(trackId);
  }, [selectTrack, playbackMode]);
  
  const handleTrackDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>, trackId: string) => {
    // Disable track removal during playback
    if (playbackMode === 'playback') return;
    
    e.stopPropagation();
    // Remove track on double click
    if (confirm('Remove this track?')) {
      removeTrack(trackId);
    }
  }, [removeTrack, playbackMode]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * meta.fps);
    return `${mins}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };
  
  return (
    <div style={{padding:'8px 12px', borderTop:'1px solid #222'}}>
      <div style={{fontSize:12, opacity:0.75}}>
        Timeline • {meta.duration.toFixed(1)}s @ {meta.fps}fps • t={formatTime(t)}
        {hoverTime !== null && (
          <span style={{marginLeft: 8, color: '#4a9eff'}}>
            • Hover: {formatTime(hoverTime)}
          </span>
        )}
      </div>
      
      {/* Mode indicator */}
      <div style={{
        display: 'inline-block',
        marginTop: 4,
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: '3px',
        background: playbackMode === 'playback' ? '#4a9eff' : '#666',
        color: '#fff',
        fontWeight: 'bold',
        textTransform: 'uppercase'
      }}>
        {playbackMode === 'playback' ? '▶️ Playback' : '✏️ Edit'}
      </div>
      
      {/* Instructions */}
      <div style={{fontSize:10, opacity:0.6, marginTop:2}}>
        {playbackMode === 'playback' ? (
          <span style={{color: '#4a9eff'}}>▶️ Playback Mode • Timeline editing disabled</span>
        ) : (
          'Click to set time • Double-click empty area to add track • Double-click track to remove'
        )}
      </div>
      
      {/* Main timeline track */}
      <div 
        style={{
          height: 40, 
          background: '#0b0b0c', 
          border: '1px solid #222', 
          marginTop: 6, 
          position: 'relative', 
          overflow: 'hidden',
          cursor: playbackMode === 'playback' ? 'default' : 'pointer',
          opacity: playbackMode === 'playback' ? 0.7 : 1
        }}
        onClick={handleTimelineClick}
        onDoubleClick={handleTimelineDoubleClick}
        onMouseMove={handleTimelineMouseMove}
        onMouseLeave={handleTimelineMouseLeave}
      >
        {/* Time markers */}
        {Array.from({ length: Math.floor(meta.duration) + 1 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i / meta.duration) * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: '#333',
              pointerEvents: 'none'
            }}
          />
        ))}
        
        {/* Hover time indicator */}
        {hoverTime !== null && (
          <div 
            style={{
              position: 'absolute', 
              left: `${(hoverTime / meta.duration) * 100}%`, 
              top: 0, 
              bottom: 0, 
              width: 1, 
              background: '#4a9eff',
              opacity: 0.6,
              pointerEvents: 'none'
            }} 
          />
        )}
        
        {/* Current time indicator */}
        <div 
          style={{
            position: 'absolute', 
            left: `${(t / meta.duration) * 100}%`, 
            top: 0, 
            bottom: 0, 
            width: 2, 
            background: '#e54d2e',
            pointerEvents: 'none'
          }} 
        />
        
        {/* Track ranges */}
        {tracks.map((track) => (
          <div
            key={track.id}
            onClick={(e) => handleTrackClick(e, track.id)}
            onDoubleClick={(e) => handleTrackDoubleClick(e, track.id)}
            style={{
              position: 'absolute',
              left: `${(track.range[0] / meta.duration) * 100}%`,
              width: `${((track.range[1] - track.range[0]) / meta.duration) * 100}%`,
              top: 8,
              bottom: 8,
              background: track.kind === 'effect' ? '#4a9eff' : '#ff6b4a',
              borderRadius: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold',
              border: track.id === selectedTrackId 
                ? '2px solid #fff' 
                : '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.1s ease',
              opacity: track.id === selectedTrackId ? 1 : 0.9
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title={`${track.module} • ${track.range[0].toFixed(1)}s - ${track.range[1].toFixed(1)}s`}
          >
            {track.module.split('/').pop()}
          </div>
        ))}
      </div>
      
      {/* Track list */}
      <div style={{marginTop: 8, fontSize: 11}}>
        {tracks.length === 0 ? (
          <div style={{opacity: 0.5, fontStyle: 'italic'}}>
            {playbackMode === 'playback' 
              ? 'No tracks to play' 
              : 'No tracks • Double-click timeline to add'
            }
          </div>
        ) : (
          tracks.map((track) => (
            <div 
              key={track.id} 
              style={{
                marginBottom: 4, 
                opacity: track.id === selectedTrackId ? 1 : (playbackMode === 'playback' ? 0.4 : 0.6),
                fontWeight: track.id === selectedTrackId ? 'bold' : 'normal',
                color: track.id === selectedTrackId ? '#4a9eff' : '#e6e6e6',
                cursor: playbackMode === 'playback' ? 'default' : 'pointer',
                padding: '2px 4px',
                borderRadius: '2px',
                background: track.id === selectedTrackId ? 'rgba(74, 158, 255, 0.1)' : 'transparent'
              }}
              onClick={() => playbackMode !== 'playback' && selectTrack(track.id)}
            >
              {track.module.split('/').pop()} • {track.range[0].toFixed(1)}s - {track.range[1].toFixed(1)}s
            </div>
          ))
        )}
      </div>
    </div>
  );
};

