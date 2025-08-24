import React from 'react';
import { Preview } from './Preview';
import { Library } from './Library';
import { Timeline } from './Timeline';
import { Inspector } from './Inspector';
import { Transport } from './Transport';

export const App: React.FC = () => {
  return (
    <div style={{display:'grid', gridTemplateRows:'auto 1fr auto', gridTemplateColumns:'260px 1fr 300px', height:'100vh', gap: '1px', background:'#161618'}}>
      <div style={{gridColumn:'1 / -1', padding:'8px 12px', background:'#0f0f10', borderBottom:'1px solid #222'}}>Demomaker MVP</div>
      <div style={{background:'#0f0f10', overflow:'auto'}}><Library/></div>
      <div style={{background:'#0a0a0b'}}><Preview/></div>
      <div style={{background:'#0f0f10', overflow:'auto'}}><Inspector/></div>
      <div style={{gridColumn:'1 / -1', background:'#0f0f10', borderTop:'1px solid #222'}}>
        <Timeline/>
        <Transport/>
      </div>
    </div>
  );
};

