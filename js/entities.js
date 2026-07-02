import { FIELD_EDGE_MARGIN_RATIO, MIN_SPAWN_DISTANCE_RATIO } from './config.js';

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
  } while (lastPos && distance(pos, lastPos) < minDistance && attempts < 20);

  return pos;
}

export function pickType(witheredRatio) {
  return Math.random() < witheredRatio ? 'withered' : 'sunflower';
}

export function createEntity(fieldWidth, fieldHeight, lastPos, stage) {
  const position = pickPosition(fieldWidth, fieldHeight, lastPos);
  return {
    id: nextId++,
    type: pickType(stage.witheredRatio),
    x: position.x,
    y: position.y,
    spawnedAt: performance.now(),
    lifetime: stage.lifetime,
  };
}

export function isExpired(entity, now) {
  return now - entity.spawnedAt >= entity.lifetime;
}
