import { setLang, getLang, detectInitialLang, hasSavedLang, t } from './i18n.js';
import {
  STAGES,
  BOSS_MAX_HP,
  BOSS_BASE_DAMAGE,
  BOSS_BRANCH_DAMAGE_BONUS,
  BOSS_WITHER_HEAL_RATIO,
  WARRIOR_BOSS_DAMAGE_BONUS,
  WARRIOR_BOSS_HEAL_REDUCTION,
  PENALTY_RATIO,
  PENALTY_RATIO_HALVED,
  PENALTY_MIN,
  COMBO_STEP,
  COMBO_STEP_MULTIPLIER,
  COMBO_CAP_DEFAULT,
  HARVEST_BONUS_MULTIPLIER,
  AUTO_HARVEST_INTERVAL_STAGE5_FARMER,
  SIM_TAPS_PER_SECOND,
  SIM_MISS_RATE,
  SIM_TARGET_TOTAL_MINUTES,
  SIM_TARGET_TOLERANCE_MINUTES,
  BRANCHES,
  PLAYTIME_SAVE_INTERVAL_MS,
  SUPPORTED_LANGS,
  HARVEST_REMOVE_DELAY,
  BOSS_DEFEAT_TO_ENDING_DELAY,
  DEBUG_POINTS_INCREMENT,
  DANGER_WARNING_THRESHOLD,
  MAX_DANGER_DARKEN_OPACITY,
  DANGER_PASSIVE_DECAY_INTERVAL_MS,
  POWERUP_SPAWN_CHANCE,
  POWERUP_BUFF_DURATION,
  POWERUP_HIT_PADDING,
} from './config.js';
import {
  state,
  currentStage,
  addHarvestPoints,
  applyWitherPenalty,
  loadState,
  getEffectiveMaxConcurrent,
  getAutoHarvestInterval,
  addDebugPoints,
  isFinalStage,
  isSunBranch,
  getBossTapDamage,
  getBossHealRatio,
  startBossFight,
  damageBoss,
  healBoss,
  setEndingType,
  addPlayTime,
  resetGame,
  getNewMonologueThreshold,
  isGameOver,
  decayDangerPassive,
  applyPowerupRelief,
  getEffectiveSpawnInterval,
  resetDanger,
} from './state.js';
import { createEntity, createPowerupEntity, isExpired, isFlipReady, applyFlip } from './entities.js';
import { tryEvolve, applyChoice } from './evolution.js';
import { onTap } from './input.js';
import {
  initUI,
  getFieldSize,
  updateHUD,
  updateCombo,
  renderEntity,
  removeEntityEl,
  playHarvestFeedback,
  showFloatingText,
  triggerWitherFeedback,
  showEvolutionToast,
  showEvolutionChoiceModal,
  initDebugButton,
  initSimulateButton,
  showFinalStageButton,
  showBossUI,
  updateBossHUD,
  hideBossUI,
  showBossIntro,
  showBossEnterFlash,
  showDialogueScene,
  showEndingScreen,
  showMonologue,
  showStartScreen,
  initLangToggle,
  refreshVisibleLabels,
  updateEntityVisual,
  updateDangerOverlay,
  setFieldBuffed,
  showDangerWarning,
} from './ui.js';

const liveEntities = new Map(); // id -> { entity, el }
let lastSpawnPos = null;
let spawnTimer = null;
let autoHarvestTimer = null;
let evolutionInProgress = false;
let phase = 'field'; // 'field' | 'boss' | 'dialogue' | 'ended'
let powerupBuffTimer = null;
let dangerWarningShown = false;

function refreshHUD() {
  updateHUD(state.points, currentStage().nameKey);
  updateCombo(state.combo.streak, state.combo.multiplier);
  updateDangerOverlay(state.danger, MAX_DANGER_DARKEN_OPACITY);
  maybeWarnDanger();
}

function maybeWarnDanger() {
  if (state.danger >= DANGER_WARNING_THRESHOLD && !dangerWarningShown) {
    dangerWarningShown = true;
    showDangerWarning(t('danger.warning'));
  } else if (state.danger < DANGER_WARNING_THRESHOLD) {
    dangerWarningShown = false;
  }
}

function restartAutoHarvest() {
  clearInterval(autoHarvestTimer);
  const interval = getAutoHarvestInterval();
  if (interval) {
    autoHarvestTimer = setInterval(autoHarvestTick, interval);
  }
}

function autoHarvestTick() {
  const entry = [...liveEntities.entries()].find(([, r]) => r.entity.type === 'sunflower');
  if (entry) handleEntityTap(entry[0]);
}

function maybeShowFinalStageButton() {
  if (!isFinalStage() || state.boss.defeated || state.endingType) return;
  const labelKey = isSunBranch() ? 'boss.enter.button.sun' : 'boss.enter.button';
  showFinalStageButton(labelKey, enterBossOrDialogue);
}

function handleEvolutionCheck() {
  tryEvolve({
    onChoiceRequired: (newStage, choices) => {
      evolutionInProgress = true;
      clearTimeout(spawnTimer);
      refreshHUD();
      showEvolutionToast(newStage.nameKey, `evo.comment.stage${newStage.id}`);
      showEvolutionChoiceModal(newStage, choices, (choiceId) => {
        applyChoice(state.stageIndex, choiceId);
        refreshHUD();
        restartAutoHarvest();
        evolutionInProgress = false;
        scheduleSpawn();
        handleEvolutionCheck(); // 큰 포인트 점프로 여러 단계를 한 번에 넘었을 경우 이어서 확인
      });
    },
    onAutoAdvance: (newStage) => {
      showEvolutionToast(newStage.nameKey, `evo.comment.stage${newStage.id}`);
      refreshHUD();
      restartAutoHarvest();
      maybeShowFinalStageButton();
      handleEvolutionCheck();
    },
  });
}

function clearLiveEntities() {
  for (const { el } of liveEntities.values()) removeEntityEl(el);
  liveEntities.clear();
}

function handleEntityTap(id) {
  if (phase === 'boss') handleBossTap(id);
  else handleFieldTap(id);
}

function handleFieldTap(id) {
  const record = liveEntities.get(id);
  if (!record) return; // 이미 처리됨 (중복 탭 방지)

  const { entity, el } = record;
  liveEntities.delete(id);

  if (entity.type === 'sunflower') {
    const gained = addHarvestPoints();
    playHarvestFeedback(el);
    showFloatingText(entity.x, entity.y, `+${gained}`, 'gain');
    setTimeout(() => removeEntityEl(el), HARVEST_REMOVE_DELAY);
    refreshHUD();

    const monologueThreshold = getNewMonologueThreshold();
    if (monologueThreshold) showMonologue(t(`monologue.${monologueThreshold}`));

    handleEvolutionCheck();
  } else if (entity.type === 'powerup') {
    playHarvestFeedback(el);
    showFloatingText(entity.x, entity.y, '★', 'gain');
    removeEntityEl(el);
    applyPowerupRelief();
    activatePowerupBuff();
    refreshHUD();
  } else {
    const lost = applyWitherPenalty();
    showFloatingText(entity.x, entity.y, `-${lost}`, 'loss');
    triggerWitherFeedback();
    removeEntityEl(el);
    refreshHUD();

    if (isGameOver()) triggerGameOver();
  }
}

function activatePowerupBuff() {
  setFieldBuffed(true, POWERUP_HIT_PADDING);
  clearTimeout(powerupBuffTimer);
  powerupBuffTimer = setTimeout(() => setFieldBuffed(false, 0), POWERUP_BUFF_DURATION);
}

function triggerGameOver() {
  phase = 'ended';
  clearTimeout(spawnTimer);
  clearLiveEntities();
  showDangerWarning(t('ending.gameover.toast'));
  setEndingType('gameover');
  setTimeout(showEnding, BOSS_DEFEAT_TO_ENDING_DELAY);
}

function handleBossTap(id) {
  const record = liveEntities.get(id);
  if (!record) return;

  const { entity, el } = record;
  liveEntities.delete(id);

  if (entity.type === 'sunflower') {
    const dealt = getBossTapDamage();
    const boss = damageBoss();
    playHarvestFeedback(el);
    showFloatingText(entity.x, entity.y, `-${dealt}`, 'gain');
    setTimeout(() => removeEntityEl(el), HARVEST_REMOVE_DELAY);
    updateBossHUD(boss.hp, BOSS_MAX_HP);
    if (boss.defeated) finishBossFight();
  } else {
    const healed = Math.round(BOSS_MAX_HP * getBossHealRatio());
    const boss = healBoss();
    showFloatingText(entity.x, entity.y, `+${healed}`, 'loss');
    triggerWitherFeedback();
    removeEntityEl(el);
    updateBossHUD(boss.hp, BOSS_MAX_HP);
  }
}

function hasLivePowerup() {
  return [...liveEntities.values()].some((r) => r.entity.type === 'powerup');
}

function trySpawn() {
  if (phase === 'dialogue' || phase === 'ended') return;
  if (evolutionInProgress) return;
  if (liveEntities.size >= getEffectiveMaxConcurrent()) return;

  const { width, height } = getFieldSize();

  if (phase === 'field' && !hasLivePowerup() && Math.random() < POWERUP_SPAWN_CHANCE) {
    const powerup = createPowerupEntity(width, height, lastSpawnPos);
    lastSpawnPos = { x: powerup.x, y: powerup.y };
    const el = renderEntity(powerup);
    onTap(el, () => handleEntityTap(powerup.id));
    liveEntities.set(powerup.id, { entity: powerup, el });
    return;
  }

  const entity = createEntity(width, height, lastSpawnPos, currentStage());
  lastSpawnPos = { x: entity.x, y: entity.y };

  const el = renderEntity(entity);
  onTap(el, () => handleEntityTap(entity.id));
  liveEntities.set(entity.id, { entity, el });
}

function scheduleSpawn() {
  clearTimeout(spawnTimer);
  spawnTimer = setTimeout(() => {
    trySpawn();
    scheduleSpawn();
  }, getEffectiveSpawnInterval());
}

function cleanupExpired() {
  const now = performance.now();
  for (const [id, { entity, el }] of liveEntities) {
    if (isFlipReady(entity, now)) {
      applyFlip(entity);
      updateEntityVisual(el, entity.type);
    }
    if (isExpired(entity, now)) {
      removeEntityEl(el);
      liveEntities.delete(id);
    }
  }
  requestAnimationFrame(cleanupExpired);
}

function enterBossOrDialogue() {
  clearTimeout(spawnTimer);
  clearLiveEntities();
  resetDanger();
  clearTimeout(powerupBuffTimer);
  setFieldBuffed(false, 0);
  updateDangerOverlay(0, MAX_DANGER_DARKEN_OPACITY);

  if (isSunBranch()) {
    phase = 'dialogue';
    const lines = [1, 2, 3, 4, 5, 6].map((n) => t(`dialogue.sun.${n}`));
    showDialogueScene(lines, () => {
      setEndingType('true');
      phase = 'ended';
      showEnding();
    });
  } else {
    phase = 'boss';
    startBossFight();
    showBossEnterFlash();
    showBossUI(BOSS_MAX_HP);
    showBossIntro(t('boss.intro'));
    lastSpawnPos = null;
    scheduleSpawn();
  }
}

function finishBossFight() {
  phase = 'ended';
  clearTimeout(spawnTimer);
  clearLiveEntities();
  hideBossUI();
  showBossIntro(t('boss.defeat.toast'));
  setEndingType('normal');
  setTimeout(showEnding, BOSS_DEFEAT_TO_ENDING_DELAY);
}

function formatPlayTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function endingTitleKey() {
  if (state.endingType === 'true') return 'ending.true.title';
  if (state.endingType === 'gameover') return 'ending.gameover.title';
  return 'ending.normal.title';
}

function showEnding() {
  const branchLabelKey = state.branch ? `branch.${state.branch}.short` : 'branch.none.short';
  const titleKey = endingTitleKey();

  showEndingScreen(titleKey, {
    playTime: formatPlayTime(state.playTimeMs),
    harvestCount: state.harvestCount,
    missCount: state.missCount,
    maxCombo: `x${state.combo.maxMultiplier.toFixed(2)} (${state.combo.maxStreak})`,
    branchLabel: t(branchLabelKey),
    showHiddenTeaser: state.endingType === 'normal' && state.branch !== 'sun',
  }, () => {
    resetGame();
    window.location.reload();
  });
}

// M5 밸런싱 시뮬레이션 도구. 실제 state는 건드리지 않고 config.js 수치만으로 기대값을 계산한다.
// 가정 빌드: 수확 +50%(A) → 페널티 절반(A) → 농부형 → 자동수확 1개/1초(B).
// (필드 확장은 스폰 속도가 병목인 이 모델에서는 처리량에 영향이 없어 시뮬레이션 대상에서 제외)
function estimateStageTimeSec(stage, pointsAtStart, opts) {
  const spawnRate = 1000 / stage.spawnInterval;
  const tapRate = Math.min(SIM_TAPS_PER_SECOND, spawnRate);
  const successTapsPerSec = tapRate * (1 - SIM_MISS_RATE);
  const missTapsPerSec = tapRate * SIM_MISS_RATE;

  const avgStreak = 1 / SIM_MISS_RATE;
  const steps = Math.floor(avgStreak / COMBO_STEP);
  const approxMultiplier = Math.min(opts.comboCap, COMBO_STEP_MULTIPLIER ** steps);

  const bonus = opts.harvestBonus ? HARVEST_BONUS_MULTIPLIER : 1;
  const pointsPerHarvest = stage.basePoints * bonus * approxMultiplier;
  const harvestPPS = successTapsPerSec * pointsPerHarvest;

  const midPoints = (pointsAtStart + stage.pointsToNext) / 2;
  const penaltyRatio = opts.penaltyHalved ? PENALTY_RATIO_HALVED : PENALTY_RATIO;
  const avgPenalty = Math.max(Math.round(midPoints * penaltyRatio), PENALTY_MIN);
  const missPPS = missTapsPerSec * avgPenalty;

  const autoPPS = opts.autoHarvestInterval ? pointsPerHarvest / (opts.autoHarvestInterval / 1000) : 0;

  const netPPS = harvestPPS - missPPS + autoPPS;
  const pointsNeeded = stage.pointsToNext - pointsAtStart;
  return netPPS > 0 ? pointsNeeded / netPPS : Infinity;
}

function estimateBossTimeSec(branch, opts) {
  const bossStage = STAGES[STAGES.length - 1];
  const spawnRate = 1000 / bossStage.spawnInterval;
  const tapRate = Math.min(SIM_TAPS_PER_SECOND, spawnRate);
  const successTapsPerSec = tapRate * (1 - SIM_MISS_RATE);
  const missTapsPerSec = tapRate * SIM_MISS_RATE;

  const damagePerTap = BOSS_BASE_DAMAGE + (BOSS_BRANCH_DAMAGE_BONUS[branch] || 0) +
    (opts.warriorAttack ? WARRIOR_BOSS_DAMAGE_BONUS : 0);
  const healRatio = opts.warriorDefense ? BOSS_WITHER_HEAL_RATIO * WARRIOR_BOSS_HEAL_REDUCTION : BOSS_WITHER_HEAL_RATIO;
  const healPerMissTap = BOSS_MAX_HP * healRatio;

  const netHpPerSec = successTapsPerSec * damagePerTap - missTapsPerSec * healPerMissTap;
  return netHpPerSec > 0 ? BOSS_MAX_HP / netHpPerSec : Infinity;
}

function runSimulation() {
  const stageOpts = [
    { harvestBonus: false, penaltyHalved: false, autoHarvestInterval: null, comboCap: COMBO_CAP_DEFAULT },
    { harvestBonus: true, penaltyHalved: false, autoHarvestInterval: null, comboCap: COMBO_CAP_DEFAULT },
    { harvestBonus: true, penaltyHalved: true, autoHarvestInterval: null, comboCap: COMBO_CAP_DEFAULT },
    { harvestBonus: true, penaltyHalved: true, autoHarvestInterval: null, comboCap: COMBO_CAP_DEFAULT },
    { harvestBonus: true, penaltyHalved: true, autoHarvestInterval: AUTO_HARVEST_INTERVAL_STAGE5_FARMER, comboCap: COMBO_CAP_DEFAULT },
  ];

  let cumulativeSec = 0;
  let pointsAtStart = 0;
  const rows = [];

  for (let i = 0; i < STAGES.length - 1; i++) {
    const stage = STAGES[i];
    const sec = estimateStageTimeSec(stage, pointsAtStart, stageOpts[i]);
    cumulativeSec += sec;
    rows.push({
      단계: `${stage.id}. ${t(STAGES[i].nameKey)} → ${t(STAGES[i + 1].nameKey)}`,
      '구간(분)': (sec / 60).toFixed(1),
      '누적(분)': (cumulativeSec / 60).toFixed(1),
    });
    pointsAtStart = stage.pointsToNext;
  }

  const bossFarmerSec = estimateBossTimeSec(BRANCHES.FARMER, { warriorAttack: false, warriorDefense: false });
  const bossWarriorSec = estimateBossTimeSec(BRANCHES.WARRIOR, { warriorAttack: true, warriorDefense: false });
  cumulativeSec += bossFarmerSec;
  rows.push({
    단계: '보스전 (농부형 가정)',
    '구간(분)': (bossFarmerSec / 60).toFixed(1),
    '누적(분)': (cumulativeSec / 60).toFixed(1),
  });

  console.log(
    `[simulate] 가정: 초당 탭 ${SIM_TAPS_PER_SECOND}회, 실수율 ${SIM_MISS_RATE * 100}%, ` +
    '빌드: 수확+50% → 페널티 절반 → 농부형 → 자동수확 1개/1초'
  );
  console.table(rows);
  console.log(`[simulate] 보스전 (전사형 가정, 참고용): ${(bossWarriorSec / 60).toFixed(1)}분`);

  const totalMin = cumulativeSec / 60;
  const withinTarget = Math.abs(totalMin - SIM_TARGET_TOTAL_MINUTES) <= SIM_TARGET_TOLERANCE_MINUTES;
  console.log(
    `[simulate] 총 ${totalMin.toFixed(1)}분 (목표 ${SIM_TARGET_TOTAL_MINUTES}±${SIM_TARGET_TOLERANCE_MINUTES}분) → ` +
    (withinTarget ? '목표 범위 내' : '목표 범위 밖')
  );

  return { rows, totalMin, withinTarget };
}

function initDebugCheat() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') !== '1') return;

  initDebugButton(() => {
    addDebugPoints(DEBUG_POINTS_INCREMENT);
    refreshHUD();
    handleEvolutionCheck();
  });

  initSimulateButton(runSimulation);
}

function startPlayTimeTicker() {
  setInterval(() => {
    if (phase !== 'ended') addPlayTime(PLAYTIME_SAVE_INTERVAL_MS);
  }, PLAYTIME_SAVE_INTERVAL_MS);
}

function startDangerDecayTicker() {
  setInterval(() => {
    if (phase !== 'field') return;
    decayDangerPassive();
    refreshHUD();
  }, DANGER_PASSIVE_DECAY_INTERVAL_MS);
}

function currentFinalStageLabelKey() {
  return isFinalStage() ? (isSunBranch() ? 'boss.enter.button.sun' : 'boss.enter.button') : null;
}

function cycleLang() {
  const idx = SUPPORTED_LANGS.indexOf(getLang());
  const next = SUPPORTED_LANGS[(idx + 1) % SUPPORTED_LANGS.length];
  setLang(next);
  refreshHUD();
  refreshVisibleLabels(currentFinalStageLabelKey());
}

function init() {
  const isFirstVisit = !hasSavedLang();
  const detected = detectInitialLang();
  setLang(detected);
  loadState();
  initUI();
  refreshHUD();
  restartAutoHarvest();
  scheduleSpawn();
  requestAnimationFrame(cleanupExpired);
  initDebugCheat();
  startPlayTimeTicker();
  startDangerDecayTicker();
  maybeShowFinalStageButton();
  initLangToggle(cycleLang);

  if (isFirstVisit) {
    showStartScreen(detected, (lang) => {
      setLang(lang);
      refreshHUD();
      refreshVisibleLabels(currentFinalStageLabelKey());
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
