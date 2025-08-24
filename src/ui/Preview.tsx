import React, { useEffect, useMemo, useRef } from 'react';
import { useProjectStore } from '../state/projectStore';
import { RendererManager, configurePost } from '../engine/RendererManager';
import { getEffect } from '../plugins/PluginManager';

export const Preview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const project = useProjectStore((s) => s.project);
  const time = useProjectStore((s) => s.transport.time);

  const activeTrack = useProjectStore((s) => s.getActiveTrack(time));
  const rmRef = useRef<RendererManager | null>(null);
  const moduleId = activeTrack?.module;

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

  // Load/Reload effect when module or fps changes
  useEffect(() => {
    const rm = rmRef.current; if (!rm || !moduleId || !activeTrack) return;
    const mod = getEffect(moduleId);
    if (!mod) return;
    rm.loadEffect(mod, activeTrack.params, project.meta.fps).then(() => {
      rm.setParams(activeTrack.params);
      configurePost(rm, project.post as any);
    });
  }, [moduleId, project.meta.fps]);

  // Update params without reloading
  useEffect(() => {
    const rm = rmRef.current; if (!rm || !activeTrack) return;
    rm.setParams(activeTrack.params);
  }, [activeTrack?.params]);

  // Placeholder: later drive time via transport/audio
  useEffect(() => { void time; }, [time]);

  return (
    <div ref={containerRef} style={{position:'relative', width:'100%', height:'100%', display:'grid', overflow:'hidden'}}>
      <canvas ref={canvasRef} style={{width:'100%', height:'100%', display:'block'}} />
      
      {/* No track indicator */}
      {!activeTrack && (
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
          <div style={{marginBottom: '8px'}}>No active track</div>
          <div style={{fontSize: '14px', opacity: 0.7}}>Add a track in the timeline</div>
        </div>
      )}
      
      {/* Current track info */}
      {activeTrack && (
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
          {activeTrack.module.split('/').pop()} • {time.toFixed(1)}s
        </div>
      )}
    </div>
  );
};
