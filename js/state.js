import { STAGES, PENALTY_RATIO, PENALTY_MIN } from './config.js';

export const state = {
  points: 0,
  stageIndex: 0, // STAGES 배열 인덱스
};

export function currentStage() {
  return STAGES[state.stageIndex];
}

export function addHarvestPoints() {
  const gained = currentStage().basePoints;
  state.points += gained;
  return gained;
}

export function applyWitherPenalty() {
  const loss = Math.max(Math.round(state.points * PENALTY_RATIO), PENALTY_MIN);
  state.points = Math.max(state.points - loss, 0);
  return loss;
}

export function canEvolve() {
  return state.stageIndex < STAGES.length - 1 &&
    state.points >= currentStage().pointsToNext;
}

export function evolve() {
  state.stageIndex += 1;
  return currentStage();
}
