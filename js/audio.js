// Web Audio 합성음 + 햅틱(진동) 전담 모듈. 외부 오디오 파일 없이 전부 코드로 생성한다.
// 브라우저 정책상 AudioContext는 첫 사용자 인터랙션 이후에만 소리가 나므로 lazy 초기화.
import {
  SOUND_MUTE_KEY,
  HEARTBEAT_BPM,
  COMBO_PITCH_STEP,
  COMBO_PITCH_MAX,
  VIBRATE_HARVEST_MS,
  VIBRATE_MISS_PATTERN,
  VIBRATE_GAMEOVER_PATTERN,
} from './config.js';

let ctx = null;
let muted = false;
let heartbeatTimer = null;
let goldenLoopTimer = null;

try {
  muted = localStorage.getItem(SOUND_MUTE_KEY) === '1';
} catch (err) {
  // localStorage 접근 불가 시 기본값(소리 켜짐) 유지
}

function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  muted = !muted;
  try {
    localStorage.setItem(SOUND_MUTE_KEY, muted ? '1' : '0');
  } catch (err) {
    console.warn('[audio] failed to save mute preference', err);
  }
  if (muted) {
    stopHeartbeat();
    stopGoldenRushLoop();
  }
  return muted;
}

// 단일 톤 재생 헬퍼. type: 파형, freq: Hz, dur: 초, gain: 볼륨, slide: 종료 시 주파수(글라이드)
function tone({ type = 'sine', freq = 440, dur = 0.1, gain = 0.15, slide = null, when = 0 }) {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;

  const osc = ac.createOscillator();
  const amp = ac.createGain();
  const t0 = ac.currentTime + when;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(slide, 1), t0 + dur);

  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// --- 게임 이벤트별 사운드 ---

// 수확: 콤보가 쌓일수록 음정이 점점 올라간다 (긴장 상승의 핵심 장치)
export function playHarvest(comboStreak) {
  const pitch = Math.min(1 + comboStreak * COMBO_PITCH_STEP, COMBO_PITCH_MAX);
  tone({ type: 'triangle', freq: 520 * pitch, dur: 0.09, gain: 0.12 });
  tone({ type: 'sine', freq: 780 * pitch, dur: 0.07, gain: 0.06, when: 0.02 });
  vibrate(VIBRATE_HARVEST_MS);
}

// 실수: 불쾌한 저역 디스토션 부저 + 묵직한 진동
export function playMiss() {
  tone({ type: 'sawtooth', freq: 150, dur: 0.25, gain: 0.2, slide: 60 });
  tone({ type: 'square', freq: 92, dur: 0.3, gain: 0.12, slide: 45, when: 0.03 });
  vibrate(VIBRATE_MISS_PATTERN);
}

// 진화: 3음 상승 징글
export function playEvolve() {
  tone({ type: 'triangle', freq: 523, dur: 0.12, gain: 0.14 });
  tone({ type: 'triangle', freq: 659, dur: 0.12, gain: 0.14, when: 0.11 });
  tone({ type: 'triangle', freq: 784, dur: 0.2, gain: 0.16, when: 0.22 });
}

// 순간 미션 성공: 짧고 경쾌한 팡파레
export function playMissionSuccess() {
  tone({ type: 'triangle', freq: 660, dur: 0.1, gain: 0.14 });
  tone({ type: 'triangle', freq: 880, dur: 0.1, gain: 0.14, when: 0.09 });
  tone({ type: 'triangle', freq: 1100, dur: 0.18, gain: 0.16, when: 0.18 });
}

// 벌(🐝): 짧고 따끔한 쏘임음
export function playBeeSting() {
  tone({ type: 'square', freq: 300, dur: 0.1, gain: 0.15, slide: 150 });
  vibrate(VIBRATE_HARVEST_MS * 2);
}

// 씨앗 주머니(🌰): 흔들리는 듯한 통통 튀는 톤
export function playSeedbagPop() {
  tone({ type: 'sine', freq: 300, dur: 0.12, gain: 0.12, slide: 200 });
}

// 파워업(⭐): 반짝이는 상승 글라이드
export function playPowerup() {
  tone({ type: 'sine', freq: 660, dur: 0.18, gain: 0.14, slide: 1320 });
  tone({ type: 'sine', freq: 990, dur: 0.14, gain: 0.08, slide: 1980, when: 0.05 });
}

// 황금 해바라기: 짧고 화려한 팡파레
export function playGolden() {
  tone({ type: 'square', freq: 784, dur: 0.08, gain: 0.1 });
  tone({ type: 'square', freq: 988, dur: 0.08, gain: 0.1, when: 0.07 });
  tone({ type: 'square', freq: 1319, dur: 0.16, gain: 0.12, when: 0.14 });
  vibrate(VIBRATE_HARVEST_MS * 3);
}

// 게임오버: 하강 스팅 + 긴 진동
export function playGameOver() {
  tone({ type: 'sawtooth', freq: 220, dur: 0.5, gain: 0.18, slide: 55 });
  tone({ type: 'sine', freq: 110, dur: 0.9, gain: 0.14, slide: 40, when: 0.15 });
  vibrate(VIBRATE_GAMEOVER_PATTERN);
}

// --- 심장박동 루프 (위험도 임계 초과 시) ---

function heartbeatThump() {
  // "쿵-쿵" 두 박자 저역 펄스
  tone({ type: 'sine', freq: 55, dur: 0.12, gain: 0.28, slide: 35 });
  tone({ type: 'sine', freq: 50, dur: 0.1, gain: 0.2, slide: 32, when: 0.18 });
}

export function startHeartbeat() {
  if (heartbeatTimer || muted) return;
  const intervalMs = 60000 / HEARTBEAT_BPM;
  heartbeatThump();
  heartbeatTimer = setInterval(heartbeatThump, intervalMs);
}

export function stopHeartbeat() {
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

export function isHeartbeatActive() {
  return heartbeatTimer !== null;
}

// --- 필드 이벤트 (§7-2d) ---

// 이벤트 발동 1초 전 예고 배너와 함께 울리는 경고음 (3종 공통)
export function playEventIncoming() {
  tone({ type: 'sine', freq: 880, dur: 0.08, gain: 0.12 });
  tone({ type: 'sine', freq: 880, dur: 0.08, gain: 0.12, when: 0.12 });
}

function goldenArpeggio() {
  tone({ type: 'square', freq: 523, dur: 0.08, gain: 0.08 });
  tone({ type: 'square', freq: 659, dur: 0.08, gain: 0.08, when: 0.08 });
  tone({ type: 'square', freq: 784, dur: 0.08, gain: 0.08, when: 0.16 });
}

// 황금 러시 지속 시간 동안 반복되는 밝은 아르페지오 루프
export function startGoldenRushLoop() {
  if (goldenLoopTimer || muted) return;
  goldenArpeggio();
  goldenLoopTimer = setInterval(goldenArpeggio, 500);
}

export function stopGoldenRushLoop() {
  clearInterval(goldenLoopTimer);
  goldenLoopTimer = null;
}
