// Deterministic seeded PRNG for the Monte Carlo engine. No Math.random, no
// Date.now — the seed is an explicit input so the same seed yields a byte-
// identical stream (methodology v2.0 §Determinism, non-negotiable #6).
//
// mulberry32: 32-bit state, single-multiply-shift step. Fast, well-distributed
// over [0,1), and trivial to reproduce across environments.

export interface Prng {
  /** Next uniform in [0, 1). */
  next(): number;
  /** Next standard-normal draw (mean 0, sd 1). */
  nextGaussian(): number;
}

/**
 * mulberry32 uniform generator. `seed` is coerced to a 32-bit unsigned int so
 * any finite number (or fractional seed) maps to a stable stream.
 */
export function mulberry32(seed: number): () => number {
  // >>> 0 forces unsigned 32-bit; seeds differing only in the low 32 bits would
  // collide, which is acceptable and documented for snapshot reproducibility.
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded PRNG with a Box-Muller gaussian on top of mulberry32. Box-Muller
 * produces two normals per pair of uniforms; the spare is cached so the stream
 * stays deterministic regardless of call interleaving.
 */
export function createPrng(seed: number): Prng {
  const uniform = mulberry32(seed);
  let spare: number | null = null;

  function next(): number {
    return uniform();
  }

  function nextGaussian(): number {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    // Guard u1 away from 0 so log() is finite.
    let u1 = uniform();
    const u2 = uniform();
    if (u1 < 1e-12) u1 = 1e-12;
    const mag = Math.sqrt(-2 * Math.log(u1));
    const angle = 2 * Math.PI * u2;
    spare = mag * Math.sin(angle);
    return mag * Math.cos(angle);
  }

  return { next, nextGaussian };
}
