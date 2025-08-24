import React from 'react';

export const Library: React.FC = () => {
  return (
    <div style={{padding:12}}>
      <h3 style={{margin:'8px 0'}}>Library</h3>
      <div style={{opacity:0.7, fontSize:12}}>Effects, Transitions, Post (coming soon)</div>
      <ul style={{marginTop:8, lineHeight:1.6}}>
        <li>@pack/wire-morph</li>
        <li>@trans/cross-fade</li>
        <li>Bloom</li>
      </ul>
    </div>
  );
};

