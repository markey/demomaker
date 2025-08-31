import React, { useEffect, useMemo, useRef } from 'react';
import { useProjectStore } from '../state/projectStore';
import { RendererManager, configurePost } from '../engine/RendererManager';
import { getEffect } from '../plugins/PluginManager';
import type { Track, TransitionTrack } from '../state/projectStore';

export const Preview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const project = useProjectStore((s) => s.project);
  const time = useProjectStore((s) => s.transport.time);
  const playbackMode = useProjectStore((s) => s.transport.playbackMode);

  const rmRef = useRef<RendererManager | null>(null);

  // Compute active effects and transitions
  const activeEffects = project.tracks.filter(track =>
    track.kind === 'effect' && time >= track.range[0] && time < track.range[1]
  );

  const activeTransitions = project.tracks.filter(track =>
    track.kind === 'transition' && time >= track.range[0] && time < track.range[1]
  );

  // For backward compatibility
  const activeTrack = activeEffects[0] || null;

  // Init once
  useEffect(() => {
    const canvas = canvasRef.current!;
    rmRef.current = new RendererManager(canvas, project.meta.fps);
    rmRef.current.start();
    
    // Ensure initial sizing is correct with a small delay
    setTimeout(() => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width && rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
          rmRef.current?.forceViewportUpdate?.();
        }
      }
    }, 100);
    
    return () => { rmRef.current?.dispose(); rmRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add ResizeObserver for proper canvas sizing
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Force canvas size update to prevent drift
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          // Trigger immediate viewport update
          rmRef.current?.forceViewportUpdate?.();
        }
      }
    });

    resizeObserver.observe(container);
    
    // Backup window resize listener
    const handleWindowResize = () => {
      if (container && canvas) {
        const rect = container.getBoundingClientRect();
        if (rect.width && rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
          rmRef.current?.forceViewportUpdate?.();
        }
      }
    };
    
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  // Load/Reload effects based on active tracks
  useEffect(() => {
    const rm = rmRef.current; if (!rm) return;

    if (activeEffects.length > 1) {
      // Load multiple effects for transitions
      const effectsToLoad = activeEffects.map(track => ({
        id: track.id,
        moduleId: track.module,
        params: track.params
      }));

      rm.loadMultipleEffects(effectsToLoad).then(() => {
        configurePost(rm, project.post as any);
      });

      // Load transitions if any
      if (activeTransitions.length > 0) {
        const transitionsToLoad = activeTransitions.map(track => ({
          id: track.id,
          moduleId: track.module,
          params: track.params
        }));

        rm.loadTransitions(transitionsToLoad);
      }
    } else if (activeEffects.length === 1) {
      // Single effect - use original method
      const track = activeEffects[0];
      const mod = getEffect(track.module);
      if (!mod) return;
      rm.loadEffect(mod, track.params, project.meta.fps).then(() => {
        rm.setParams(track.params);
        configurePost(rm, project.post as any);
      });
    }
  }, [activeEffects, activeTransitions, project.meta.fps]);

  // Update params without reloading (for single effect compatibility)
  useEffect(() => {
    const rm = rmRef.current;
    if (!rm || activeEffects.length !== 1) return;

    const track = activeEffects[0];
    if (track) {
      rm.setParams(track.params);
    }
  }, [activeEffects.map(e => e.params)]);

  // Synchronize renderer time with transport time
  useEffect(() => {
    const rm = rmRef.current; if (!rm) return;
    rm.setTime(time);
  }, [time]);

  return (
    <div ref={containerRef} style={{position:'relative', width:'100%', height:'100%', display:'grid', overflow:'hidden'}}>
      <canvas ref={canvasRef} style={{width:'100%', height:'100%', display:'block'}} />
      
            {/* No track indicator */}
      {activeEffects.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
          fontSize: '18px',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{marginBottom: '8px'}}>
            {playbackMode === 'playback' ? 'No active effect' : 'No active track'}
          </div>
          <div style={{fontSize: '14px', opacity: 0.7}}>
            {playbackMode === 'playback'
              ? 'Add tracks to the timeline'
              : 'Add a track in the timeline'
            }
          </div>
        </div>
      )}

      {/* Current track info */}
      {activeEffects.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none'
        }}>
          {activeEffects.length === 1
            ? `${activeEffects[0].module.split('/').pop()} • ${time.toFixed(1)}s`
            : `${activeEffects.length} effects • ${time.toFixed(1)}s`
          }
          {activeTransitions.length > 0 && (
            <div style={{fontSize: '10px', opacity: 0.8, marginTop: '2px'}}>
              ⚡ {activeTransitions.length} transition{activeTransitions.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
      
      {/* Mode indicator */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: playbackMode === 'playback' ? 'rgba(74, 158, 255, 0.8)' : 'rgba(102, 102, 102, 0.8)',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 'bold',
        pointerEvents: 'none',
        textTransform: 'uppercase'
      }}>
        {playbackMode === 'playback' ? 'Playback' : 'Edit'}
      </div>
      
      {/* Time indicator */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        pointerEvents: 'none',
        fontFamily: 'monospace'
      }}>
        {Math.floor(time / 60)}:{(time % 60).toFixed(1).padStart(4, '0')}
      </div>
    </div>
  );
};
