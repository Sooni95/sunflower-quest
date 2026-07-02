import { canEvolve, evolve } from './state.js';

// M1: 선택지 없이 조건 충족 시 자동으로 다음 단계로 진화한다.
export function tryAutoEvolve(onEvolve) {
  if (!canEvolve()) return false;
  const newStage = evolve();
  onEvolve(newStage);
  return true;
}
