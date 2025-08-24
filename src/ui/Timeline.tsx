import React, { useCallback, useState, useRef } from 'react';
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
  const updateTrackRange = useProjectStore((s) => s.updateTrackRange);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-start' | 'resize-end' | null;
    trackId: string;
    startX: number;
    startTime: number;
    originalRange: [number, number];
  } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
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

  // Drag and resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, trackId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    if (playbackMode === 'playback') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    console.log(`Starting ${type} for track:`, trackId, 'at position:', e.clientX);
    
    setDragState({
      type,
      trackId,
      startX: e.clientX,
      startTime: (e.clientX - rect.left) / rect.width * meta.duration,
      originalRange: [...track.range] as [number, number]
    });
    
    // Select the track when starting to drag
    selectTrack(trackId);
  }, [playbackMode, tracks, meta.duration, selectTrack]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const currentX = e.clientX;
    const deltaX = currentX - dragState.startX;
    const deltaTime = (deltaX / rect.width) * meta.duration;
    
    const track = tracks.find(t => t.id === dragState.trackId);
    if (!track) return;
    
    let newRange: [number, number] = [...track.range];
    
    if (dragState.type === 'move') {
      // Move the entire track
      const newStart = Math.max(0, Math.min(meta.duration - (track.range[1] - track.range[0]), dragState.originalRange[0] + deltaTime));
      const duration = track.range[1] - track.range[0];
      newRange = [newStart, newStart + duration];
    } else if (dragState.type === 'resize-start') {
      // Resize from start (left edge)
      const newStart = Math.max(0, Math.min(dragState.originalRange[1] - 0.5, dragState.originalRange[0] + deltaTime));
      newRange = [newStart, dragState.originalRange[1]];
    } else if (dragState.type === 'resize-end') {
      // Resize from end (right edge)
      const newEnd = Math.max(dragState.originalRange[0] + 0.5, Math.min(meta.duration, dragState.originalRange[1] + deltaTime));
      newRange = [dragState.originalRange[0], newEnd];
    }
    
    // Only update if the range actually changed
    if (newRange[0] !== track.range[0] || newRange[1] !== track.range[1]) {
      console.log(`Updating track ${dragState.trackId} range:`, track.range, '→', newRange);
      updateTrackRange(dragState.trackId, newRange);
    }
  }, [dragState, tracks, meta.duration, updateTrackRange]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // Add global mouse event listeners
  React.useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);
  
  return (
    <div ref={timelineRef} style={{padding:'8px 12px', borderTop:'1px solid #222'}}>
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
          'Click to set time • Drag tracks to move • Drag edges to resize • Double-click empty area to add track • Double-click track to remove'
        )}
      </div>
      
      {/* Main timeline track */}
      <div 
        style={{
          height: 72, 
          background: '#0b0b0c', 
          border: '1px solid #222', 
          marginTop: 6, 
          position: 'relative', 
          overflow: 'hidden',
          cursor: dragState ? 'grabbing' : (playbackMode === 'playback' ? 'default' : 'pointer'),
          opacity: playbackMode === 'playback' ? 0.7 : 1
        }}
        onClick={handleTimelineClick}
        onDoubleClick={handleTimelineDoubleClick}
        onMouseMove={handleTimelineMouseMove}
        onMouseLeave={handleTimelineMouseLeave}
      >
        {/* Drag indicator overlay */}
        {dragState && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(74, 158, 255, 0.1)',
            border: '2px dashed #4a9eff',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.8)',
              color: '#4a9eff',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {dragState.type === 'move' ? 'Moving track...' : 
               dragState.type === 'resize-start' ? 'Resizing start...' : 'Resizing end...'}
            </div>
          </div>
        )}
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
            style={{
              position: 'absolute',
              left: `${(track.range[0] / meta.duration) * 100}%`,
              width: `${((track.range[1] - track.range[0]) / meta.duration) * 100}%`,
              top: 8,
              bottom: 8,
              background: track.kind === 'effect' ? '#4a9eff' : '#ff6b4a',
              borderRadius: 2,
              cursor: playbackMode === 'playback' ? 'default' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: '#fff',
              fontWeight: 'bold',
              border: track.id === selectedTrackId 
                ? '2px solid #fff' 
                : '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.1s ease',
              opacity: track.id === selectedTrackId ? 1 : 0.9,
              userSelect: 'none'
            }}
            onClick={(e) => {
              e.stopPropagation();
              selectTrack(track.id);
            }}
            onMouseDown={(e) => handleMouseDown(e, track.id, 'move')}
            onDoubleClick={(e) => handleTrackDoubleClick(e, track.id)}
            onMouseEnter={(e) => {
              if (playbackMode !== 'playback') {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                e.currentTarget.style.cursor = 'grab';
              }
            }}
            onMouseLeave={(e) => {
              if (playbackMode !== 'playback') {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.cursor = 'grab';
              }
            }}
            title={`${track.module} • ${track.range[0].toFixed(1)}s - ${track.range[1].toFixed(1)}s • Click to select, drag to move, drag edges to resize`}
          >
            {track.module.split('/').pop()}
          </div>
        ))}
        
        {/* Resize handles - rendered separately to avoid cursor conflicts */}
        {tracks.map((track) => 
          playbackMode !== 'playback' ? (
            <React.Fragment key={`resize-${track.id}`}>
              {/* Left resize handle */}
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${(track.range[0] / meta.duration) * 100}% - 4px)`,
                  top: 8,
                  bottom: 8,
                  width: 8,
                  background: track.id === selectedTrackId ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                  cursor: 'ew-resize',
                  borderRadius: '2px 0 0 2px',
                  zIndex: 15,
                  border: `1px solid ${track.id === selectedTrackId ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)'}`
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectTrack(track.id); // Select track first
                  handleMouseDown(e, track.id, 'resize-start');
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = track.id === selectedTrackId ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.borderColor = track.id === selectedTrackId ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)';
                }}
              />
              
              {/* Right resize handle */}
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${(track.range[1] / meta.duration) * 100}% - 4px)`,
                  top: 8,
                  bottom: 8,
                  width: 8,
                  background: track.id === selectedTrackId ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                  cursor: 'ew-resize',
                  borderRadius: '0 2px 2px 0',
                  zIndex: 15,
                  border: `1px solid ${track.id === selectedTrackId ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)'}`
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectTrack(track.id); // Select track first
                  handleMouseDown(e, track.id, 'resize-end');
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = track.id === selectedTrackId ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.borderColor = track.id === selectedTrackId ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)';
                }}
              />
            </React.Fragment>
          ) : null
        )}
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
                background: track.id === selectedTrackId ? 'rgba(74, 158, 255, 0.1)' : 'transparent',
                transition: 'all 0.1s ease'
              }}
              onClick={() => playbackMode !== 'playback' && selectTrack(track.id)}
              onMouseEnter={(e) => {
                if (playbackMode !== 'playback' && track.id !== selectedTrackId) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (playbackMode !== 'playback' && track.id !== selectedTrackId) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {track.module.split('/').pop()} • {track.range[0].toFixed(1)}s - {track.range[1].toFixed(1)}s
            </div>
          ))
        )}
      </div>
    </div>
  );
};

