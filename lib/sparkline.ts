// SIMULATED history: deterministic seeded random walk ending at the current
// spread. Replace with real snapshots once a persistence layer is wired up
// (see README — Redis step is skipped when UPSTASH_* env vars are absent).

/** FNV-1a string hash → uint32 seed. */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG — deterministic per seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 7-point series ending at `end`, smoothed so it looks plausible. */
export function seededSpreadHistory(seedKey: string, end: number): number[] {
  const rand = mulberry32(hashSeed(seedKey));
  const pts: number[] = [];
  let v = end + (rand() - 0.5) * 12;
  for (let i = 0; i < 7; i++) {
    pts.push(v);
    v += (rand() - 0.5) * 6;
  }
  // anchor the last point to today's spread, relax earlier points toward it
  pts[6] = end;
  pts[5] = pts[5] * 0.5 + end * 0.5;
  return pts.map((p) => Math.round(p * 10) / 10);
}
