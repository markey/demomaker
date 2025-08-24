import React, { useEffect, useRef } from 'react';
import { useProjectStore } from '../state/projectStore';
import { RendererManager, configurePost } from '../engine/RendererManager';
import { getEffect } from '../plugins/PluginManager';

export const Preview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const project = useProjectStore((s) => s.project);
  const time = useProjectStore((s) => s.transport.time);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const rm = new RendererManager(canvas, project.meta.fps);

    const track = project.tracks.find(t => t.kind === 'effect');
    const mod = track && getEffect(track.module);
    if (mod) {
      rm.loadEffect(mod, track.params, project.meta.fps).then(() => {
        rm.setParams(track.params);
        configurePost(rm, project.post as any);
        rm.start();
      });
    } else {
      rm.start();
    }

    return () => rm.dispose();
  }, [project]);

  useEffect(() => {
    // Placeholder: later drive time via transport/audio
    void time;
  }, [time]);

  return (
    <div style={{position:'relative', width:'100%', height:'100%', display:'grid'}}>
      <canvas ref={canvasRef} style={{width:'100%', height:'100%', display:'block'}} />
    </div>
  );
};
