import { setLang } from './i18n.js';
import { state, currentStage, addHarvestPoints, applyWitherPenalty } from './state.js';
import { createEntity, isExpired } from './entities.js';
import { tryAutoEvolve } from './evolution.js';
import { onTap } from './input.js';
import {
  initUI,
  getFieldSize,
  updateHUD,
  renderEntity,
  removeEntityEl,
  playHarvestFeedback,
  showFloatingText,
  triggerWitherFeedback,
  showEvolutionToast,
} from './ui.js';

const liveEntities = new Map(); // id -> { entity, el }
let lastSpawnPos = null;
let spawnTimer = null;

function refreshHUD() {
  updateHUD(state.points, currentStage().nameKey);
}

function handleEvolutionCheck() {
  tryAutoEvolve((newStage) => {
    showEvolutionToast(newStage.nameKey);
    refreshHUD();
  });
}

function handleTap(id) {
  const record = liveEntities.get(id);
  if (!record) return; // 이미 처리됨 (중복 탭 방지)

  const { entity, el } = record;
  liveEntities.delete(id);

  if (entity.type === 'sunflower') {
    const gained = addHarvestPoints();
    playHarvestFeedback(el);
    showFloatingText(entity.x, entity.y, `+${gained}`, 'gain');
    setTimeout(() => removeEntityEl(el), 150);
    refreshHUD();
    handleEvolutionCheck();
  } else {
    const lost = applyWitherPenalty();
    showFloatingText(entity.x, entity.y, `-${lost}`, 'loss');
    triggerWitherFeedback();
    removeEntityEl(el);
    refreshHUD();
  }
}

function trySpawn() {
  if (liveEntities.size >= currentStage().maxConcurrent) return;

  const { width, height } = getFieldSize();
  const entity = createEntity(width, height, lastSpawnPos, currentStage());
  lastSpawnPos = { x: entity.x, y: entity.y };

  const el = renderEntity(entity);
  onTap(el, () => handleTap(entity.id));
  liveEntities.set(entity.id, { entity, el });
}

function scheduleSpawn() {
  clearTimeout(spawnTimer);
  spawnTimer = setTimeout(() => {
    trySpawn();
    scheduleSpawn();
  }, currentStage().spawnInterval);
}

function cleanupExpired() {
  const now = performance.now();
  for (const [id, { entity, el }] of liveEntities) {
    if (isExpired(entity, now)) {
      removeEntityEl(el);
      liveEntities.delete(id);
    }
  }
  requestAnimationFrame(cleanupExpired);
}

function init() {
  setLang('ko');
  initUI();
  refreshHUD();
  scheduleSpawn();
  requestAnimationFrame(cleanupExpired);
}

document.addEventListener('DOMContentLoaded', init);
