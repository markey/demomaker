export function encodeWavPCM16(channels: Float32Array[], sampleRate: number): Blob {
  const numChannels = channels.length;
  const numFrames = channels[0].length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  let offset = 0;
  function writeString(s: string) { for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i)); }
  function writeUint32(v: number) { view.setUint32(offset, v, true); offset += 4; }
  function writeUint16(v: number) { view.setUint16(offset, v, true); offset += 2; }

  writeString('RIFF');
  writeUint32(36 + dataSize);
  writeString('WAVE');
  writeString('fmt ');
  writeUint32(16); // PCM chunk size
  writeUint16(1); // PCM format
  writeUint16(numChannels);
  writeUint32(sampleRate);
  writeUint32(byteRate);
  writeUint16(blockAlign);
  writeUint16(16); // bits per sample
  writeString('data');
  writeUint32(dataSize);

  // Interleave and write samples
  const interleaved = new Int16Array(numFrames * numChannels);
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      interleaved[i * numChannels + ch] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
  }

  new Uint8Array(buffer, 44).set(new Uint8Array(interleaved.buffer));
  return new Blob([buffer], { type: 'audio/wav' });
}

