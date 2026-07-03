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
  GOLDEN_SPAWN_CHANCE,
  GOLDEN_POINT_MULTIPLIER,
  HEARTBEAT_DANGER_THRESHOLD,
  EVENT_TYPES,
  EVENT_WEIGHTS,
  EVENT_MIN_STAGE_ID,
  EVENT_INTERVAL_MIN_MS,
  EVENT_INTERVAL_MAX_MS,
  EVENT_WARNING_MS,
  EVENT_GOLDEN_RUSH_DURATION_MS,
  EVENT_GOLDEN_RUSH_SPAWN_FACTOR,
  EVENT_STORM_DURATION_MS,
  EVENT_STORM_WITHERED_RATIO,
  EVENT_STORM_SPAWN_FACTOR,
  EVENT_STORM_CLEAR_DANGER_RELIEF,
  EVENT_STORM_CLEAR_BONUS_MULTIPLIER,
  EVENT_GUST_DURATION_MS,
  EVENT_GUST_POINT_MULTIPLIER,
  EVENT_GUST_AMPLITUDE_PX,
  EVENT_GUST_PERIOD_MS,
  MIN_EFFECTIVE_SPAWN_INTERVAL,
  SPECIAL_ENTITY_MIN_STAGE_ID,
  BEE_SPAWN_CHANCE,
  BEE_DANGER_PENALTY,
  SEEDBAG_SPAWN_CHANCE,
  SEEDBAG_POP_DELAY_MS,
  SEEDBAG_BURST_COUNT,
  SEEDBAG_BURST_LIFETIME_RATIO,
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
  addBonusPoints,
  applyStormClearRelief,
  applyBeeDangerPenalty,
} from './state.js';
import {
  createEntity,
  createPowerupEntity,
  createGoldenEntity,
  createBeeEntity,
  createSeedbagEntity,
  createBurstEntity,
  isExpired,
  isFlipReady,
  applyFlip,
} from './entities.js';
import {
  playHarvest,
  playMiss,
  playEvolve,
  playPowerup,
  playGolden,
  playGameOver,
  startHeartbeat,
  stopHeartbeat,
  isMuted,
  toggleMuted,
  playEventIncoming,
  startGoldenRushLoop,
  stopGoldenRushLoop,
  playBeeSting,
  playSeedbagPop,
} from './audio.js';
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
  setDangerVignette,
  initSoundToggle,
  showEventBanner,
  setEventTint,
} from './ui.js';

const liveEntities = new Map(); // id -> { entity, el }
let lastSpawnPos = null;
let spawnTimer = null;
let autoHarvestTimer = null;
let evolutionInProgress = false;
let phase = 'field'; // 'field' | 'boss' | 'dialogue' | 'ended'
let powerupBuffTimer = null;
let dangerWarningShown = false;

// --- 필드 이벤트 (§7-2d, DESIGN-M7.md P1) ---
let eventTimer = null;      // 다음 예약된 콜백(대기/예고/종료) 하나만 들고 있음
let activeEvent = null;     // { type } — 예고 중이 아니라 실제 진행 중일 때만 세팅
let stormNoMiss = true;     // 시든 폭풍 동안 한 번도 안 놓쳤는지

const EVENT_DURATIONS_MS = {
  [EVENT_TYPES.GOLDEN_RUSH]: EVENT_GOLDEN_RUSH_DURATION_MS,
  [EVENT_TYPES.WITHER_STORM]: EVENT_STORM_DURATION_MS,
  [EVENT_TYPES.GUST]: EVENT_GUST_DURATION_MS,
};

const EVENT_TINTS = {
  [EVENT_TYPES.GOLDEN_RUSH]: 'rgba(255, 193, 7, 0.14)',
  [EVENT_TYPES.WITHER_STORM]: 'rgba(103, 58, 183, 0.22)',
  [EVENT_TYPES.GUST]: null,
};

function refreshHUD() {
  updateHUD(state.points, currentStage().nameKey);
  updateCombo(state.combo.streak, state.combo.multiplier);
  updateDangerOverlay(state.danger, MAX_DANGER_DARKEN_OPACITY);
  maybeWarnDanger();
  syncHeartbeat();
}

function maybeWarnDanger() {
  if (state.danger >= DANGER_WARNING_THRESHOLD && !dangerWarningShown) {
    dangerWarningShown = true;
    showDangerWarning(t('danger.warning'));
  } else if (state.danger < DANGER_WARNING_THRESHOLD) {
    dangerWarningShown = false;
  }
}

// 위험도 임계 초과 시 심장박동 사운드 + 붉은 비네트를 함께 켜고 끈다.
// 시든 폭풍 이벤트 중에는 위험도와 무관하게 강제로 켠다 (§7-2d).
function syncHeartbeat() {
  const stormForced = activeEvent?.type === EVENT_TYPES.WITHER_STORM;
  const critical = phase === 'field' && (state.danger >= HEARTBEAT_DANGER_THRESHOLD || stormForced);
  setDangerVignette(critical);
  if (critical) startHeartbeat();
  else stopHeartbeat();
}

// --- 필드 이벤트 스케줄러 ---

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickWeightedEvent() {
  const entries = Object.entries(EVENT_WEIGHTS);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of entries) {
    if (roll < weight) return type;
    roll -= weight;
  }
  return entries[0][0];
}

function getEventSpawnFactor() {
  if (activeEvent?.type === EVENT_TYPES.GOLDEN_RUSH) return EVENT_GOLDEN_RUSH_SPAWN_FACTOR;
  if (activeEvent?.type === EVENT_TYPES.WITHER_STORM) return EVENT_STORM_SPAWN_FACTOR;
  return 1;
}

function scheduleNextEventCheck() {
  clearTimeout(eventTimer);
  eventTimer = setTimeout(maybeStartEvent, randomBetween(EVENT_INTERVAL_MIN_MS, EVENT_INTERVAL_MAX_MS));
}

function maybeStartEvent() {
  if (phase !== 'field') return; // 필드를 완전히 벗어남(보스전/대화/게임오버) — 스케줄러 종료

  if (currentStage().id < EVENT_MIN_STAGE_ID) {
    scheduleNextEventCheck();
    return;
  }

  const type = pickWeightedEvent();
  playEventIncoming();
  showEventBanner(t(`event.${type}.incoming`), EVENT_WARNING_MS);
  eventTimer = setTimeout(() => startEvent(type), EVENT_WARNING_MS);
}

function startEvent(type) {
  if (phase !== 'field') return; // 예고 중에 보스전 등으로 전환된 경우

  activeEvent = { type };
  if (type === EVENT_TYPES.WITHER_STORM) stormNoMiss = true;

  setEventTint(EVENT_TINTS[type]);
  if (type === EVENT_TYPES.GOLDEN_RUSH) startGoldenRushLoop();
  syncHeartbeat();

  eventTimer = setTimeout(() => endEvent(type), EVENT_DURATIONS_MS[type]);
}

// 보너스 지급 없이 즉시 중단 (모달/보스전 진입 등으로 인터럽트될 때)
function abortActiveEvent() {
  clearTimeout(eventTimer);
  eventTimer = null;
  if (activeEvent?.type === EVENT_TYPES.GOLDEN_RUSH) stopGoldenRushLoop();
  setEventTint(null);
  activeEvent = null;
  syncHeartbeat();
}

function endEvent(type) {
  if (type === EVENT_TYPES.WITHER_STORM && stormNoMiss) {
    applyStormClearRelief(EVENT_STORM_CLEAR_DANGER_RELIEF);
    addBonusPoints(currentStage().basePoints * EVENT_STORM_CLEAR_BONUS_MULTIPLIER);
    showDangerWarning(t('event.storm.cleared'));
    refreshHUD();
  }
  if (type === EVENT_TYPES.GOLDEN_RUSH) stopGoldenRushLoop();

  setEventTint(null);
  activeEvent = null;
  syncHeartbeat();
  scheduleNextEventCheck();
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
      abortActiveEvent(); // 진화 모달이 열리면 진행 중이던 필드 이벤트는 즉시 종료 (§7-2d)
      refreshHUD();
      playEvolve();
      showEvolutionToast(newStage.nameKey, `evo.comment.stage${newStage.id}`);
      showEvolutionChoiceModal(newStage, choices, (choiceId) => {
        applyChoice(state.stageIndex, choiceId);
        refreshHUD();
        restartAutoHarvest();
        evolutionInProgress = false;
        scheduleSpawn();
        scheduleNextEventCheck();
        handleEvolutionCheck(); // 큰 포인트 점프로 여러 단계를 한 번에 넘었을 경우 이어서 확인
      });
    },
    onAutoAdvance: (newStage) => {
      playEvolve();
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

  if (entity.type === 'sunflower' || entity.type === 'golden') {
    const isGolden = entity.type === 'golden';
    const multiplier = isGolden ? GOLDEN_POINT_MULTIPLIER : (entity.gustBoosted ? EVENT_GUST_POINT_MULTIPLIER : 1);
    const gained = addHarvestPoints(multiplier);
    playHarvestFeedback(el);
    showFloatingText(entity.x, entity.y, `+${gained}`, 'gain');
    setTimeout(() => removeEntityEl(el), HARVEST_REMOVE_DELAY);
    if (isGolden) playGolden();
    else playHarvest(state.combo.streak);
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
    playPowerup();
    refreshHUD();
  } else if (entity.type === 'bee') {
    removeEntityEl(el);
    applyBeeDangerPenalty(BEE_DANGER_PENALTY);
    playBeeSting();
    refreshHUD();

    if (isGameOver()) triggerGameOver();
  } else if (entity.type === 'seedbag') {
    playHarvestFeedback(el);
    removeEntityEl(el);
    playSeedbagPop();
    scheduleSeedbagBurst(entity.x, entity.y);
  } else {
    const lost = applyWitherPenalty();
    showFloatingText(entity.x, entity.y, `-${lost}`, 'loss');
    triggerWitherFeedback();
    removeEntityEl(el);
    playMiss();
    if (activeEvent?.type === EVENT_TYPES.WITHER_STORM) stormNoMiss = false;
    refreshHUD();

    if (isGameOver()) triggerGameOver();
  }
}

function activatePowerupBuff() {
  setFieldBuffed(true, POWERUP_HIT_PADDING);
  clearTimeout(powerupBuffTimer);
  powerupBuffTimer = setTimeout(() => setFieldBuffed(false, 0), POWERUP_BUFF_DURATION);
}

// 씨앗 주머니를 탭하고 SEEDBAG_POP_DELAY_MS 후, 그 자리 주변에 해바라기를 무더기로 팝한다.
function scheduleSeedbagBurst(x, y) {
  setTimeout(() => {
    if (phase !== 'field') return; // 지연 중 보스전/대화 등으로 전환된 경우
    const { width, height } = getFieldSize();
    const burstLifetime = currentStage().lifetime * SEEDBAG_BURST_LIFETIME_RATIO;

    for (let i = 0; i < SEEDBAG_BURST_COUNT; i++) {
      const entity = createBurstEntity(width, height, x, y, burstLifetime);
      const el = renderEntity(entity);
      onTap(el, () => handleEntityTap(entity.id));
      liveEntities.set(entity.id, { entity, el });
    }
  }, SEEDBAG_POP_DELAY_MS);
}

function triggerGameOver() {
  phase = 'ended';
  clearTimeout(spawnTimer);
  clearLiveEntities();
  abortActiveEvent();
  stopHeartbeat();
  setDangerVignette(false);
  playGameOver();
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
    playHarvest(0);
    updateBossHUD(boss.hp, BOSS_MAX_HP);
    if (boss.defeated) finishBossFight();
  } else {
    const healed = Math.round(BOSS_MAX_HP * getBossHealRatio());
    const boss = healBoss();
    showFloatingText(entity.x, entity.y, `+${healed}`, 'loss');
    triggerWitherFeedback();
    removeEntityEl(el);
    playMiss();
    updateBossHUD(boss.hp, BOSS_MAX_HP);
  }
}

function hasLiveType(type) {
  return [...liveEntities.values()].some((r) => r.entity.type === type);
}

function spawnSpecial(factory, width, height) {
  const special = factory(width, height, lastSpawnPos);
  lastSpawnPos = { x: special.x, y: special.y };
  const el = renderEntity(special);
  onTap(el, () => handleEntityTap(special.id));
  liveEntities.set(special.id, { entity: special, el });
}

function trySpawn() {
  if (phase === 'dialogue' || phase === 'ended') return;
  if (evolutionInProgress) return;
  if (liveEntities.size >= getEffectiveMaxConcurrent()) return;

  const { width, height } = getFieldSize();

  // 황금 러시 중에는 신규 스폰이 전부 황금(동시 다수 허용, 1개 제한 무시)
  if (phase === 'field' && activeEvent?.type === EVENT_TYPES.GOLDEN_RUSH) {
    spawnSpecial(createGoldenEntity, width, height);
    return;
  }

  if (phase === 'field' && !hasLiveType('powerup') && Math.random() < POWERUP_SPAWN_CHANCE) {
    spawnSpecial(createPowerupEntity, width, height);
    return;
  }

  if (phase === 'field' && !hasLiveType('golden') && Math.random() < GOLDEN_SPAWN_CHANCE) {
    spawnSpecial(createGoldenEntity, width, height);
    return;
  }

  const specialEntitiesUnlocked = currentStage().id >= SPECIAL_ENTITY_MIN_STAGE_ID;

  if (phase === 'field' && specialEntitiesUnlocked && !hasLiveType('bee') && Math.random() < BEE_SPAWN_CHANCE) {
    spawnSpecial(createBeeEntity, width, height);
    return;
  }

  if (phase === 'field' && specialEntitiesUnlocked && !hasLiveType('seedbag') && Math.random() < SEEDBAG_SPAWN_CHANCE) {
    spawnSpecial(createSeedbagEntity, width, height);
    return;
  }

  const witheredRatioOverride = activeEvent?.type === EVENT_TYPES.WITHER_STORM ? EVENT_STORM_WITHERED_RATIO : null;
  const entity = createEntity(width, height, lastSpawnPos, currentStage(), witheredRatioOverride);

  if (phase === 'field' && activeEvent?.type === EVENT_TYPES.GUST) {
    entity.motion = {
      kind: 'sine',
      baseX: entity.x,
      amplitude: EVENT_GUST_AMPLITUDE_PX,
      periodMs: EVENT_GUST_PERIOD_MS,
      phase: Math.random() * Math.PI * 2,
    };
    entity.gustBoosted = true;
  }

  lastSpawnPos = { x: entity.x, y: entity.y };

  const el = renderEntity(entity);
  onTap(el, () => handleEntityTap(entity.id));
  liveEntities.set(entity.id, { entity, el });
}

function scheduleSpawn() {
  clearTimeout(spawnTimer);
  const interval = Math.max(getEffectiveSpawnInterval() * getEventSpawnFactor(), MIN_EFFECTIVE_SPAWN_INTERVAL);
  spawnTimer = setTimeout(() => {
    trySpawn();
    scheduleSpawn();
  }, interval);
}

// 좌우 이동 개체(돌풍의 사인파, 벌의 직선 이동) 공통 갱신.
function updateEntityMotion(entity, el, now) {
  if (!entity.motion) return;
  const elapsed = now - entity.spawnedAt;
  let offset = 0;

  if (entity.motion.kind === 'sine') {
    offset = entity.motion.amplitude * Math.sin((2 * Math.PI * elapsed) / entity.motion.periodMs + entity.motion.phase);
  } else if (entity.motion.kind === 'linear') {
    const progress = Math.min(elapsed / entity.motion.durationMs, 1);
    offset = entity.motion.distance * progress;
  }

  entity.x = entity.motion.baseX + offset;
  el.style.setProperty('--motion-dx', `${offset}px`);
}

function cleanupExpired() {
  const now = performance.now();
  for (const [id, { entity, el }] of liveEntities) {
    updateEntityMotion(entity, el, now);
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
  abortActiveEvent();
  clearTimeout(powerupBuffTimer);
  setFieldBuffed(false, 0);
  updateDangerOverlay(0, MAX_DANGER_DARKEN_OPACITY);
  stopHeartbeat();
  setDangerVignette(false);

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
  scheduleNextEventCheck();
  maybeShowFinalStageButton();
  initLangToggle(cycleLang);
  initSoundToggle(isMuted(), toggleMuted);

  if (isFirstVisit) {
    showStartScreen(detected, (lang) => {
      setLang(lang);
      refreshHUD();
      refreshVisibleLabels(currentFinalStageLabelKey());
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
