import {
  STAGES,
  PENALTY_RATIO,
  PENALTY_RATIO_HALVED,
  PENALTY_MIN,
  COMBO_STEP,
  COMBO_STEP_MULTIPLIER,
  COMBO_CAP_DEFAULT,
  COMBO_CAP_FARMER,
  HARVEST_BONUS_MULTIPLIER,
  FIELD_EXPANSION_BONUS,
  AUTO_HARVEST_INTERVAL_STAGE2,
  AUTO_HARVEST_INTERVAL_STAGE5_FARMER,
  BRANCHES,
  BOSS_MAX_HP,
  BOSS_BASE_DAMAGE,
  BOSS_BRANCH_DAMAGE_BONUS,
  BOSS_WITHER_HEAL_RATIO,
  WARRIOR_BOSS_DAMAGE_BONUS,
  WARRIOR_BOSS_HEAL_REDUCTION,
  MONOLOGUE_THRESHOLDS,
  DANGER_PER_MISS,
  DANGER_DECAY_PER_HARVEST,
  DANGER_PASSIVE_DECAY_PER_TICK,
  MAX_DANGER,
  DANGER_SPEED_UP_FACTOR,
  MIN_EFFECTIVE_SPAWN_INTERVAL,
  STAGE_PROGRESS_SPEED_UP_FACTOR,
  POWERUP_DANGER_RELIEF,
  SAVE_KEY,
} from './config.js';

const initialState = {
  points: 0,
  stageIndex: 0,
  branch: null, // 'warrior' | 'farmer' | 'sun'
  missCount: 0, // 시든 꽃 탭 횟수 (엔딩 통계용, §7-6)
  harvestCount: 0,
  playTimeMs: 0,
  danger: 0, // 위험도 0~100. MAX_DANGER 도달 시 게임오버 (필드 단계 전용)
  shownMonologues: [], // 이미 노출한 혼잣말 임계값 목록
  upgrades: {
    harvestBonus: false,
    autoHarvestSlow: false,
    penaltyHalved: false,
    fieldExpansion: false,
    warriorAttack: false,
    warriorDefense: false,
    comboCapUp: false,
    autoHarvestFast: false,
  },
  combo: {
    streak: 0,
    multiplier: 1.0,
    maxStreak: 0,
    maxMultiplier: 1.0,
  },
  boss: {
    hp: BOSS_MAX_HP,
    defeated: false,
  },
  endingType: null, // null | 'normal' | 'true'
};

export const state = structuredClone(initialState);

export function currentStage() {
  return STAGES[state.stageIndex];
}

function getComboCap() {
  return state.upgrades.comboCapUp ? COMBO_CAP_FARMER : COMBO_CAP_DEFAULT;
}

export function getEffectivePenaltyRatio() {
  return state.upgrades.penaltyHalved ? PENALTY_RATIO_HALVED : PENALTY_RATIO;
}

export function getEffectiveMaxConcurrent() {
  return currentStage().maxConcurrent + (state.upgrades.fieldExpansion ? FIELD_EXPANSION_BONUS : 0);
}

export function getAutoHarvestInterval() {
  if (state.upgrades.autoHarvestFast) return AUTO_HARVEST_INTERVAL_STAGE5_FARMER;
  if (state.upgrades.autoHarvestSlow) return AUTO_HARVEST_INTERVAL_STAGE2;
  return null;
}

export function addHarvestPoints() {
  const bonus = state.upgrades.harvestBonus ? HARVEST_BONUS_MULTIPLIER : 1;
  const gained = Math.round(currentStage().basePoints * bonus * state.combo.multiplier);
  state.points += gained;
  state.harvestCount += 1;

  state.combo.streak += 1;
  if (state.combo.streak % COMBO_STEP === 0) {
    state.combo.multiplier = Math.min(state.combo.multiplier * COMBO_STEP_MULTIPLIER, getComboCap());
  }
  state.combo.maxStreak = Math.max(state.combo.maxStreak, state.combo.streak);
  state.combo.maxMultiplier = Math.max(state.combo.maxMultiplier, state.combo.multiplier);
  state.danger = Math.max(state.danger - DANGER_DECAY_PER_HARVEST, 0);

  saveState();
  return gained;
}

export function applyWitherPenalty() {
  const ratio = getEffectivePenaltyRatio();
  const loss = Math.max(Math.round(state.points * ratio), PENALTY_MIN);
  state.points = Math.max(state.points - loss, 0);
  state.combo.streak = 0;
  state.combo.multiplier = 1.0;
  state.missCount += 1;
  state.danger = Math.min(state.danger + DANGER_PER_MISS, MAX_DANGER);

  saveState();
  return loss;
}

export function isGameOver() {
  return state.danger >= MAX_DANGER;
}

export function decayDangerPassive() {
  state.danger = Math.max(state.danger - DANGER_PASSIVE_DECAY_PER_TICK, 0);
  saveState();
  return state.danger;
}

export function applyPowerupRelief() {
  state.danger = Math.max(state.danger - POWERUP_DANGER_RELIEF, 0);
  saveState();
  return state.danger;
}

// 위험도가 높을수록 스폰 간격이 짧아진다 (최대 DANGER_SPEED_UP_FACTOR 만큼, 하한선 있음).
// 현재 단계에서 다음 진화까지의 진행도 0~1. 최종 단계(pointsToNext=Infinity)는 항상 0.
export function getStageProgress() {
  const target = currentStage().pointsToNext;
  if (!isFinite(target)) return 0;
  const start = state.stageIndex > 0 ? STAGES[state.stageIndex - 1].pointsToNext : 0;
  const progress = (state.points - start) / (target - start);
  return Math.min(Math.max(progress, 0), 1);
}

export function getEffectiveSpawnInterval() {
  const base = currentStage().spawnInterval;
  const dangerCut = DANGER_SPEED_UP_FACTOR * (state.danger / MAX_DANGER);
  const progressCut = STAGE_PROGRESS_SPEED_UP_FACTOR * getStageProgress();
  const reduced = base * (1 - dangerCut) * (1 - progressCut);
  return Math.max(reduced, MIN_EFFECTIVE_SPAWN_INTERVAL);
}

export function canEvolve() {
  return state.stageIndex < STAGES.length - 1 &&
    state.points >= currentStage().pointsToNext;
}

export function isFinalStage() {
  return state.stageIndex === STAGES.length - 1;
}

// 새로 도달한 혼잣말 임계값이 있으면 반환하고 노출 처리한다. 없으면 null.
export function getNewMonologueThreshold() {
  const next = MONOLOGUE_THRESHOLDS.find(
    (th) => state.harvestCount >= th && !state.shownMonologues.includes(th)
  );
  if (next !== undefined) {
    state.shownMonologues.push(next);
    saveState();
    return next;
  }
  return null;
}

export function evolve() {
  state.stageIndex += 1;
  saveState();
  return currentStage();
}

export function applyEffect(effectId) {
  if (effectId in state.upgrades) {
    state.upgrades[effectId] = true;
    saveState();
  }
}

export function setBranch(branchId) {
  state.branch = branchId;
  saveState();
}

export function addDebugPoints(amount) {
  state.points += amount;
  saveState();
}

// --- 보스전 (§7-5) ---

export function getBossTapDamage() {
  const branchBonus = BOSS_BRANCH_DAMAGE_BONUS[state.branch] || 0;
  const warriorBonus = state.upgrades.warriorAttack ? WARRIOR_BOSS_DAMAGE_BONUS : 0;
  return BOSS_BASE_DAMAGE + branchBonus + warriorBonus;
}

export function getBossHealRatio() {
  return state.upgrades.warriorDefense
    ? BOSS_WITHER_HEAL_RATIO * WARRIOR_BOSS_HEAL_REDUCTION
    : BOSS_WITHER_HEAL_RATIO;
}

export function startBossFight() {
  state.boss.hp = BOSS_MAX_HP;
  state.boss.defeated = false;
  saveState();
}

export function damageBoss() {
  state.boss.hp = Math.max(state.boss.hp - getBossTapDamage(), 0);
  if (state.boss.hp === 0) state.boss.defeated = true;
  saveState();
  return state.boss;
}

export function healBoss() {
  state.boss.hp = Math.min(state.boss.hp + BOSS_MAX_HP * getBossHealRatio(), BOSS_MAX_HP);
  saveState();
  return state.boss;
}

export function setEndingType(type) {
  state.endingType = type;
  saveState();
}

export function isSunBranch() {
  return state.branch === BRANCHES.SUN;
}

// 보스전/대화 씬 진입 시 위험도를 초기화한다 (위험도는 필드 단계 전용 메커니즘).
export function resetDanger() {
  state.danger = 0;
  saveState();
}

// --- 플레이 시간 / 저장 / 초기화 ---

export function addPlayTime(deltaMs) {
  state.playTimeMs += deltaMs;
  saveState();
}

export function resetGame() {
  Object.assign(state, structuredClone(initialState));
  Object.assign(state.upgrades, initialState.upgrades);
  Object.assign(state.combo, initialState.combo);
  Object.assign(state.boss, initialState.boss);
  saveState();
}

export function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[state] failed to save', err);
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
    Object.assign(state.upgrades, saved.upgrades);
    Object.assign(state.combo, saved.combo);
    Object.assign(state.boss, saved.boss);
  } catch (err) {
    console.warn('[state] failed to load save, starting fresh', err);
  }
}
