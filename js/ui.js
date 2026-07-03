import { t } from './i18n.js';
import { onTap } from './input.js';
import {
  FLOATING_TEXT_DURATION,
  SHAKE_DURATION,
  EVOLUTION_TOAST_DURATION,
  MONOLOGUE_DISPLAY_DURATION,
  BOSS_ENTER_FLASH_DURATION,
  BOSS_INTRO_TOAST_DURATION,
} from './config.js';

const ENTITY_EMOJI = {
  sunflower: '🌻',
  withered: '🥀',
  powerup: '⭐',
  golden: '🌻', // 같은 글리프에 골드 글로우 CSS로 차별화
  bee: '🐝',
  seedbag: '🌰',
};

let pointsEl;
let stageEl;
let comboEl;
let fieldEl;
let flashEl;
let dangerEl;
let eventTintEl;
let gameRootEl;

export function initUI() {
  pointsEl = document.getElementById('hud-points');
  stageEl = document.getElementById('hud-stage');
  comboEl = document.getElementById('hud-combo');
  fieldEl = document.getElementById('field');
  flashEl = document.getElementById('flash-overlay');
  dangerEl = document.getElementById('danger-overlay');
  eventTintEl = document.getElementById('event-tint');
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

export function updateCombo(streak, multiplier) {
  if (streak <= 0 || multiplier <= 1) {
    comboEl.textContent = '';
    return;
  }
  comboEl.textContent = `${t('hud.combo')} x${multiplier.toFixed(2)} (${streak})`;
}

export function renderEntity(entity) {
  const el = document.createElement('div');
  el.className = `entity ${entity.type}`;
  el.style.left = `${entity.x}px`;
  el.style.top = `${entity.y}px`;
  el.textContent = ENTITY_EMOJI[entity.type];
  el.dataset.id = entity.id;
  fieldEl.appendChild(el);
  return el;
}

export function removeEntityEl(el) {
  el.remove();
}

// 페이크 패턴이 뒤집힐 때 표시를 갱신한다.
export function updateEntityVisual(el, type) {
  el.className = `entity ${type} flip-pop`;
  el.textContent = ENTITY_EMOJI[type];
}

// 위험도(0~100)에 비례해 필드를 어둡게 한다.
export function updateDangerOverlay(dangerPercent, maxDarkenOpacity) {
  const opacity = (dangerPercent / 100) * maxDarkenOpacity;
  dangerEl.style.background = `rgba(10, 5, 15, ${opacity})`;
}

// 위험도 임계 초과 시 심장박동에 맞춘 붉은 비네트 맥동 on/off
export function setDangerVignette(active) {
  gameRootEl.classList.toggle('danger-critical', active);
}

export function initSoundToggle(initialMuted, onToggle) {
  const btn = document.getElementById('hud-sound-btn');
  btn.textContent = initialMuted ? '🔇' : '🔊';
  onTap(btn, () => {
    const nowMuted = onToggle();
    btn.textContent = nowMuted ? '🔇' : '🔊';
  });
}

// 파워업 버프 on/off. hitPaddingPx는 버프 중 탭 판정 영역 확장폭.
export function setFieldBuffed(active, hitPaddingPx) {
  fieldEl.classList.toggle('field-buffed', active);
  fieldEl.style.setProperty('--powerup-hit-padding', active ? `${hitPaddingPx}px` : '0px');
}

// 필드 이벤트(§7-2d) 예고 배너. durationMs 후 자동으로 사라진다.
export function showEventBanner(text, durationMs) {
  const el = document.createElement('div');
  el.className = 'event-banner';
  el.textContent = text;
  gameRootEl.appendChild(el);
  setTimeout(() => el.remove(), durationMs);
}

// 필드 이벤트 진행 중 화면 틴트. color가 null이면 해제.
export function setEventTint(color) {
  eventTintEl.style.background = color || 'rgba(0, 0, 0, 0)';
}

export function showDangerWarning(text) {
  const el = document.createElement('div');
  el.className = 'boss-intro-toast';
  el.textContent = text;
  gameRootEl.appendChild(el);
  setTimeout(() => el.remove(), BOSS_INTRO_TOAST_DURATION);
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

export function showEvolutionToast(stageNameKey, flavorKey) {
  const el = document.createElement('div');
  el.className = 'evolution-toast';

  const title = document.createElement('div');
  title.textContent = `${t('evolution.toast')} → ${t(stageNameKey)}`;
  el.appendChild(title);

  if (flavorKey) {
    const flavor = document.createElement('div');
    flavor.className = 'evolution-toast-flavor';
    flavor.textContent = t(flavorKey);
    el.appendChild(flavor);
  }

  gameRootEl.appendChild(el);
  setTimeout(() => el.remove(), EVOLUTION_TOAST_DURATION);
}

export function showMonologue(text) {
  const el = document.createElement('div');
  el.className = 'monologue-banner';
  el.textContent = text;
  gameRootEl.appendChild(el);
  setTimeout(() => el.remove(), MONOLOGUE_DISPLAY_DURATION);
}

// 진화 선택 모달. choices: [{ id, labelKey }]. onPick(choiceId)가 카드 클릭 시 호출된다.
export function showEvolutionChoiceModal(stage, choices, onPick) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const panel = document.createElement('div');
  panel.className = 'modal-panel';

  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.textContent = `${t('modal.evolve.title')} — ${t(stage.nameKey)}`;
  panel.appendChild(title);

  const cardWrap = document.createElement('div');
  cardWrap.className = 'choice-cards';

  choices.forEach((choice) => {
    const card = document.createElement('button');
    card.className = 'choice-card';
    card.textContent = t(choice.labelKey);
    onTap(card, () => {
      onPick(choice.id);
      overlay.remove();
    });
    cardWrap.appendChild(card);
  });

  panel.appendChild(cardWrap);
  overlay.appendChild(panel);
  gameRootEl.appendChild(overlay);
}

// 최초 방문 시 노출되는 언어 선택 시작 화면.
export function showStartScreen(defaultLang, onSelect) {
  const overlay = document.createElement('div');
  overlay.id = 'start-screen';
  overlay.className = 'modal-overlay';

  const panel = document.createElement('div');
  panel.className = 'modal-panel start-panel';

  const title = document.createElement('h1');
  title.className = 'start-title';
  title.textContent = t('start.title');
  panel.appendChild(title);

  const tagline = document.createElement('p');
  tagline.className = 'start-tagline';
  tagline.textContent = t('evo.comment.stage1');
  panel.appendChild(tagline);

  const langWrap = document.createElement('div');
  langWrap.className = 'choice-cards';
  [['ko', 'start.lang.ko'], ['en', 'start.lang.en'], ['ja', 'start.lang.ja']].forEach(([code, labelKey]) => {
    const btn = document.createElement('button');
    btn.className = 'choice-card';
    if (code === defaultLang) btn.classList.add('choice-card-active');
    btn.textContent = t(labelKey);
    onTap(btn, () => {
      overlay.remove();
      onSelect(code);
    });
    langWrap.appendChild(btn);
  });
  panel.appendChild(langWrap);

  overlay.appendChild(panel);
  gameRootEl.appendChild(overlay);
}

export function initLangToggle(onCycle) {
  onTap(document.getElementById('hud-lang-btn'), onCycle);
}

// 언어 전환 직후 현재 화면에 떠 있는 정적 라벨을 즉시 갱신한다.
export function refreshVisibleLabels(finalStageLabelKey) {
  const finalBtn = document.getElementById('final-stage-btn');
  if (finalBtn && finalStageLabelKey) finalBtn.textContent = t(finalStageLabelKey);

  const bossLabel = document.querySelector('.boss-hud-label');
  if (bossLabel) bossLabel.textContent = t('boss.hud.label');
}

export function initDebugButton(onClick) {
  const btn = document.createElement('button');
  btn.id = 'debug-cheat-btn';
  btn.textContent = t('debug.cheat.button');
  gameRootEl.appendChild(btn);
  onTap(btn, onClick);
}

export function initSimulateButton(onClick) {
  const btn = document.createElement('button');
  btn.id = 'debug-simulate-btn';
  btn.textContent = t('debug.simulate.button');
  gameRootEl.appendChild(btn);
  onTap(btn, onClick);
}

// 최종형 도달 시 뜨는 보스전/대화 진입 버튼.
export function showFinalStageButton(labelKey, onClick) {
  const btn = document.createElement('button');
  btn.id = 'final-stage-btn';
  btn.textContent = t(labelKey);
  gameRootEl.appendChild(btn);
  onTap(btn, () => {
    btn.remove();
    onClick();
  });
}

let bossHpEl;

export function showBossUI(maxHp) {
  const bar = document.createElement('div');
  bar.id = 'boss-hud';
  bar.innerHTML = `
    <span class="boss-hud-label">${t('boss.hud.label')}</span>
    <div class="boss-hp-track"><div class="boss-hp-fill" id="boss-hp-fill"></div></div>
  `;
  gameRootEl.appendChild(bar);
  bossHpEl = document.getElementById('boss-hp-fill');
  updateBossHUD(maxHp, maxHp);
}

export function updateBossHUD(hp, maxHp) {
  if (!bossHpEl) return;
  bossHpEl.style.width = `${Math.max((hp / maxHp) * 100, 0)}%`;
}

export function hideBossUI() {
  document.getElementById('boss-hud')?.remove();
  bossHpEl = null;
}

export function showBossEnterFlash() {
  const el = document.createElement('div');
  el.className = 'boss-enter-flash';
  gameRootEl.appendChild(el);
  setTimeout(() => el.remove(), BOSS_ENTER_FLASH_DURATION);
}

export function showBossIntro(text) {
  const el = document.createElement('div');
  el.className = 'boss-intro-toast';
  el.textContent = text;
  gameRootEl.appendChild(el);
  setTimeout(() => el.remove(), BOSS_INTRO_TOAST_DURATION);
}

// 태양형 진 엔딩 대화 씬. 화면 탭으로 다음 대사로 넘어간다.
export function showDialogueScene(lines, onComplete) {
  const overlay = document.createElement('div');
  overlay.id = 'dialogue-scene';
  overlay.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'dialogue-box';
  const textEl = document.createElement('p');
  textEl.className = 'dialogue-text';
  const hintEl = document.createElement('span');
  hintEl.className = 'dialogue-hint';
  hintEl.textContent = t('dialogue.tapHint');
  box.appendChild(textEl);
  box.appendChild(hintEl);
  overlay.appendChild(box);
  gameRootEl.appendChild(overlay);

  let index = 0;
  const showLine = () => { textEl.textContent = lines[index]; };
  showLine();

  onTap(overlay, () => {
    index += 1;
    if (index >= lines.length) {
      overlay.remove();
      onComplete();
    } else {
      showLine();
    }
  });
}

// 엔딩 통계 화면. stats: { playTime, harvestCount, missCount, maxCombo, branchLabelKey }
export function showEndingScreen(titleKey, stats, onRestart) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const panel = document.createElement('div');
  panel.className = 'modal-panel ending-panel';

  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.textContent = t(titleKey);
  panel.appendChild(title);

  const list = document.createElement('dl');
  list.className = 'ending-stats';
  const rows = [
    ['ending.stat.playtime', stats.playTime],
    ['ending.stat.harvest', stats.harvestCount],
    ['ending.stat.miss', stats.missCount],
    ['ending.stat.maxCombo', stats.maxCombo],
    ['ending.stat.branch', stats.branchLabel],
  ];
  rows.forEach(([labelKey, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = t(labelKey);
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.appendChild(dt);
    list.appendChild(dd);
  });
  panel.appendChild(list);

  if (stats.showHiddenTeaser) {
    const teaser = document.createElement('p');
    teaser.className = 'ending-teaser';
    teaser.textContent = t('ending.hiddenTeaser');
    panel.appendChild(teaser);
  }

  const restartBtn = document.createElement('button');
  restartBtn.className = 'choice-card';
  restartBtn.textContent = t('ending.restart');
  panel.appendChild(restartBtn);
  onTap(restartBtn, onRestart);

  overlay.appendChild(panel);
  gameRootEl.appendChild(overlay);
}
