// 모든 게임플레이 수치의 단일 소스. 밸런싱 시 이 파일만 수정한다.

export const STAGES = [
  {
    id: 1,
    nameKey: 'stage.1.name',
    spawnInterval: 1500,     // ms
    maxConcurrent: 3,
    lifetime: 2500,          // ms
    witheredRatio: 0.10,
    basePoints: 1,
    pointsToNext: 50,        // 다음 단계로 진화하는 데 필요한 누적 포인트
  },
  {
    id: 2,
    nameKey: 'stage.2.name',
    spawnInterval: 1200,
    maxConcurrent: 4,
    lifetime: 2200,
    witheredRatio: 0.15,
    basePoints: 2,
    pointsToNext: 300,
  },
];

export const PENALTY_RATIO = 0.05;   // 시든 꽃 탭 시 현재 포인트의 5% 감소
export const PENALTY_MIN = 10;       // 페널티 최소값

export const FIELD_EDGE_MARGIN_RATIO = 0.10;  // 화면 가장자리 10% 여백 제외
export const MIN_SPAWN_DISTANCE_RATIO = 0.15; // 직전 스폰 위치와 최소 거리(필드 대각선 대비 비율)

export const FLOATING_TEXT_DURATION = 700;   // ms
export const SHAKE_DURATION = 200;           // ms, §5 화면 흔들림 + 붉은 플래시
