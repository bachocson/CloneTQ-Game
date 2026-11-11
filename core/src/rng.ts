// Bộ sinh số ngẫu nhiên có seed (mulberry32), để trận đánh và bot chạy lại được y hệt.
import type { GameState } from './types.js';

function step(a: number): number {
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    return step(a);
  };
}

/** Lấy một số ngẫu nhiên từ state và lưu lại trạng thái rng vào state. */
export function rand(state: GameState): number {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  return step(state.rng);
}

export function weightedPick(r: number, weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let x = r * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return weights.length - 1;
}
