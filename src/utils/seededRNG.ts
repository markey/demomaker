export function createSeededRNG(seed = 1337) {
  // Mulberry32
  let t = seed >>> 0;
  const next = () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(max: number) { return Math.floor(next() * max); },
    range(min: number, max: number) { return min + (max - min) * next(); }
  };
}

