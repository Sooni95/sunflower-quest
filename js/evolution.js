import { EVOLUTION_CHOICES, BRANCHES, SUN_BRANCH_CHANCE } from './config.js';
import { state, canEvolve, evolve, applyEffect, setBranch } from './state.js';

// 새로 진입한 단계(stageIndex)에 제시할 선택지를 반환한다. 없으면 null (자동 진화).
export function getChoicesForStage(stageIndex) {
  const entry = EVOLUTION_CHOICES[stageIndex];
  if (!entry) return null;

  if (entry.branchChoice) {
    // 4단계 대분기. 히든 태양형은 실력과 무관하게 확률로 세 번째 카드에 등장한다.
    const isLucky = Math.random() < SUN_BRANCH_CHANCE;
    return entry.options.filter((opt) => !opt.hidden || isLucky);
  }

  if (Array.isArray(entry)) return entry;

  // 5단계: 3단계에서 고른 분기(branch)에 따라 선택지가 달라진다.
  return entry[state.branch] || null;
}

export function applyChoice(stageIndex, choiceId) {
  const entry = EVOLUTION_CHOICES[stageIndex];
  if (!entry) return;

  if (entry.branchChoice) {
    setBranch(choiceId);
    return;
  }

  const list = Array.isArray(entry) ? entry : entry[state.branch] || [];
  const choice = list.find((c) => c.id === choiceId);
  if (choice) applyEffect(choice.effect);
}

// 진화 조건 충족 시 단계를 올리고, 선택지가 있으면 콜백으로 넘긴다.
export function tryEvolve({ onChoiceRequired, onAutoAdvance }) {
  if (!canEvolve()) return false;

  const newStage = evolve();
  const choices = getChoicesForStage(state.stageIndex);

  if (choices && choices.length > 0) {
    onChoiceRequired(newStage, choices);
  } else {
    onAutoAdvance(newStage);
  }
  return true;
}

export { BRANCHES };
