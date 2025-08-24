import React, { useEffect, useMemo, useRef } from 'react';
import { useProjectStore } from '../state/projectStore';
import { RendererManager, configurePost } from '../engine/RendererManager';
import { getEffect } from '../plugins/PluginManager';

export const Preview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const project = useProjectStore((s) => s.project);
  const time = useProjectStore((s) => s.transport.time);

  const track = useMemo(() => project.tracks.find(t => t.kind === 'effect'), [project.tracks]);
  const rmRef = useRef<RendererManager | null>(null);
  const moduleId = track?.module;

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
    const rm = rmRef.current; if (!rm || !moduleId || !track) return;
    const mod = getEffect(moduleId);
    if (!mod) return;
    rm.loadEffect(mod, track.params, project.meta.fps).then(() => {
      rm.setParams(track.params);
      configurePost(rm, project.post as any);
    });
  }, [moduleId, project.meta.fps]);

  // Update params without reloading
  useEffect(() => {
    const rm = rmRef.current; if (!rm || !track) return;
    rm.setParams(track.params);
  }, [track?.params]);

  // Placeholder: later drive time via transport/audio
  useEffect(() => { void time; }, [time]);

  return (
    <div ref={containerRef} style={{position:'relative', width:'100%', height:'100%', display:'grid', overflow:'hidden'}}>
      <canvas ref={canvasRef} style={{width:'100%', height:'100%', display:'block'}} />
    </div>
  );
};
