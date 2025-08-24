import React, { useEffect, useRef } from 'react';
import { useProjectStore } from '../state/projectStore';

export const Transport: React.FC = () => {
  const playing = useProjectStore((s) => s.transport.playing);
  const time = useProjectStore((s) => s.transport.time);
  const playbackMode = useProjectStore((s) => s.transport.playbackMode);
  const duration = useProjectStore((s) => s.project.meta.duration);
  const play = useProjectStore((s) => s.play);
  const pause = useProjectStore((s) => s.pause);
  const stop = useProjectStore((s) => s.stop);
  const setTime = useProjectStore((s) => s.setTime);
  const setPlaybackMode = useProjectStore((s) => s.setPlaybackMode);
  const req = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) { 
      if (req.current) cancelAnimationFrame(req.current); 
      return; 
    }
    
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      
      let newTime = time + dt;
      
      // Handle looping in playback mode
      if (playbackMode === 'playback' && newTime >= duration) {
        newTime = 0; // Loop back to start
      }
      
      // Stop if we've reached the end in edit mode
      if (playbackMode === 'edit' && newTime >= duration) {
        pause();
        return;
      }
      
      setTime(newTime);
      req.current = requestAnimationFrame(loop);
    };
    
    req.current = requestAnimationFrame(loop);
    return () => { if (req.current) cancelAnimationFrame(req.current); };
  }, [playing, time, duration, playbackMode, setTime, pause]);

  const handlePlay = () => {
    if (playbackMode === 'edit') {
      // Switch to playback mode when starting playback
      setPlaybackMode('playback');
    }
    play();
  };

  const handleStop = () => {
    stop();
    // Return to edit mode when stopping
    setPlaybackMode('edit');
  };

  const handlePause = () => {
    pause();
    // Stay in current mode when pausing
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 60); // Assuming 60fps for display
    return `${mins}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 12px'}}>
      <button 
        onClick={playing ? handlePause : handlePlay}
        style={{
          background: playing ? '#e54d2e' : '#4a9eff',
          color: '#fff',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <button 
        onClick={handleStop}
        style={{
          background: '#666',
          color: '#fff',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Stop
      </button>
      <div style={{marginLeft:8, fontVariantNumeric:'tabular-nums', fontSize: '12px'}}>
        {formatTime(time)} / {formatTime(duration)}
      </div>
      <div style={{
        marginLeft: 8, 
        fontSize: '10px', 
        opacity: 0.7,
        padding: '2px 6px',
        background: playbackMode === 'playback' ? '#4a9eff' : '#666',
        color: '#fff',
        borderRadius: '3px'
      }}>
        {playbackMode === 'playback' ? 'PLAYBACK' : 'EDIT'}
      </div>
    </div>
  );
};

