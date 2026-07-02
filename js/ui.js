import { t } from './i18n.js';
import { FLOATING_TEXT_DURATION, SHAKE_DURATION } from './config.js';

let pointsEl;
let stageEl;
let fieldEl;
let flashEl;
let gameRootEl;

export function initUI() {
  pointsEl = document.getElementById('hud-points');
  stageEl = document.getElementById('hud-stage');
  fieldEl = document.getElementById('field');
  flashEl = document.getElementById('flash-overlay');
  gameRootEl = document.getElementById('game-root');
}

export function getFieldSize() {
  const rect = fieldEl.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

export function updateHUD(points, stageNameKey) {
  pointsEl.textContent = `${t('hud.points')}: ${points}`;
  stageEl.textContent = `${t('hud.stage')}: ${t(stageNameKey)}`;
}

export function renderEntity(entity) {
  const el = document.createElement('div');
  el.className = `entity ${entity.type}`;
  el.style.left = `${entity.x}px`;
  el.style.top = `${entity.y}px`;
  el.textContent = entity.type === 'sunflower' ? '🌻' : '🥀';
  el.dataset.id = entity.id;
  fieldEl.appendChild(el);
  return el;
}

export function removeEntityEl(el) {
  el.remove();
}

export function playHarvestFeedback(el) {
  el.classList.add('harvest-pop');
}

export function showFloatingText(x, y, text, kind) {
  const el = document.createElement('div');
  el.className = `floating-text ${kind}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  fieldEl.appendChild(el);
  setTimeout(() => el.remove(), FLOATING_TEXT_DURATION);
}

export function triggerWitherFeedback() {
  gameRootEl.classList.add('shake');
  flashEl.classList.add('flash-active');
  setTimeout(() => {
    gameRootEl.classList.remove('shake');
    flashEl.classList.remove('flash-active');
  }, SHAKE_DURATION);
}

export function showEvolutionToast(stageNameKey) {
  const el = document.createElement('div');
  el.className = 'evolution-toast';
  el.textContent = `${t('evolution.toast')} → ${t(stageNameKey)}`;
  gameRootEl.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
