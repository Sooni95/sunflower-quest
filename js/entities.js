import {
  FIELD_EDGE_MARGIN_RATIO,
  MIN_SPAWN_DISTANCE_RATIO,
  MAX_SPAWN_POSITION_ATTEMPTS,
  FAKE_PATTERN_REVEAL_WITHER_DELAY,
  FAKE_PATTERN_REVEAL_FLOWER_DELAY,
  FAKE_PATTERN_REVEAL_WITHER_MIN_STAGE_ID,
  FAKE_PATTERN_REVEAL_FLOWER_MIN_STAGE_ID,
  FAKE_PATTERN_CHANCE,
  POWERUP_LIFETIME,
  GOLDEN_LIFETIME,
} from './config.js';

let nextId = 1;

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// 화면 가장자리 여백을 제외한 필드 내 랜덤 위치. 직전 스폰 위치와 최소 거리를 유지한다.
export function pickPosition(fieldWidth, fieldHeight, lastPos) {
  const marginX = fieldWidth * FIELD_EDGE_MARGIN_RATIO;
  const marginY = fieldHeight * FIELD_EDGE_MARGIN_RATIO;
  const diagonal = Math.hypot(fieldWidth, fieldHeight);
  const minDistance = diagonal * MIN_SPAWN_DISTANCE_RATIO;

  let pos;
  let attempts = 0;
  do {
    pos = {
      x: randomInRange(marginX, fieldWidth - marginX),
      y: randomInRange(marginY, fieldHeight - marginY),
    };
    attempts += 1;
  } while (lastPos && distance(pos, lastPos) < minDistance && attempts < MAX_SPAWN_POSITION_ATTEMPTS);

  return pos;
}

export function pickType(witheredRatio) {
  return Math.random() < witheredRatio ? 'withered' : 'sunflower';
}

// 페이크 패턴: 변신형(해바라기→시든 꽃)은 4단계부터, 위장형(시든 꽃→해바라기)은 5단계부터 등장한다.
function rollFakePattern(baseType, stageId) {
  if (baseType === 'sunflower' && stageId >= FAKE_PATTERN_REVEAL_WITHER_MIN_STAGE_ID) {
    if (Math.random() < FAKE_PATTERN_CHANCE) {
      return { flipAt: performance.now() + FAKE_PATTERN_REVEAL_WITHER_DELAY };
    }
  } else if (baseType === 'withered' && stageId >= FAKE_PATTERN_REVEAL_FLOWER_MIN_STAGE_ID) {
    if (Math.random() < FAKE_PATTERN_CHANCE) {
      return { flipAt: performance.now() + FAKE_PATTERN_REVEAL_FLOWER_DELAY };
    }
  }
  return { flipAt: null };
}

// witheredRatioOverride: 필드 이벤트(시든 폭풍 등)가 스폰 시점의 시든 꽃 비율을 임시로 덮어쓸 때 사용.
export function createEntity(fieldWidth, fieldHeight, lastPos, stage, witheredRatioOverride = null) {
  const position = pickPosition(fieldWidth, fieldHeight, lastPos);
  const baseType = pickType(witheredRatioOverride ?? stage.witheredRatio);
  const { flipAt } = rollFakePattern(baseType, stage.id);

  return {
    id: nextId++,
    type: baseType,
    x: position.x,
    y: position.y,
    spawnedAt: performance.now(),
    lifetime: stage.lifetime,
    flipAt,
  };
}

export function createPowerupEntity(fieldWidth, fieldHeight, lastPos) {
  const position = pickPosition(fieldWidth, fieldHeight, lastPos);
  return {
    id: nextId++,
    type: 'powerup',
    x: position.x,
    y: position.y,
    spawnedAt: performance.now(),
    lifetime: POWERUP_LIFETIME,
    flipAt: null,
  };
}

// 황금 해바라기: 초단명 고득점. 페이크 패턴 없음.
export function createGoldenEntity(fieldWidth, fieldHeight, lastPos) {
  const position = pickPosition(fieldWidth, fieldHeight, lastPos);
  return {
    id: nextId++,
    type: 'golden',
    x: position.x,
    y: position.y,
    spawnedAt: performance.now(),
    lifetime: GOLDEN_LIFETIME,
    flipAt: null,
  };
}

export function isExpired(entity, now) {
  return now - entity.spawnedAt >= entity.lifetime;
}

export function isFlipReady(entity, now) {
  return entity.flipAt !== null && now >= entity.flipAt;
}

export function applyFlip(entity) {
  entity.type = entity.type === 'sunflower' ? 'withered' : 'sunflower';
  entity.flipAt = null;
}
