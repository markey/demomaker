import React, { useEffect, useRef } from 'react';
import { useProjectStore } from '../state/projectStore';

export const Transport: React.FC = () => {
  const playing = useProjectStore((s) => s.transport.playing);
  const time = useProjectStore((s) => s.transport.time);
  const play = useProjectStore((s) => s.play);
  const pause = useProjectStore((s) => s.pause);
  const setTime = useProjectStore((s) => s.setTime);
  const req = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) { if (req.current) cancelAnimationFrame(req.current); return; }
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime(time + dt);
      req.current = requestAnimationFrame(loop);
    };
    req.current = requestAnimationFrame(loop);
    return () => { if (req.current) cancelAnimationFrame(req.current); };
  }, [playing]);

  return (
    <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 12px'}}>
      <button onClick={() => playing ? pause() : play()}>{playing ? 'Pause' : 'Play'}</button>
      <button onClick={() => setTime(0)}>Stop</button>
      <div style={{marginLeft:8, fontVariantNumeric:'tabular-nums'}}>t={time.toFixed(2)}s</div>
    </div>
  );
};

