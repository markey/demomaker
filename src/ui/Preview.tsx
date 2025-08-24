import React, { useEffect, useMemo, useRef } from 'react';
import { useProjectStore } from '../state/projectStore';
import { RendererManager, configurePost } from '../engine/RendererManager';
import { getEffect } from '../plugins/PluginManager';

export const Preview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
    return () => { rmRef.current?.dispose(); rmRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div style={{position:'relative', width:'100%', height:'100%', display:'grid'}}>
      <canvas ref={canvasRef} style={{width:'100%', height:'100%', display:'block'}} />
    </div>
  );
};
