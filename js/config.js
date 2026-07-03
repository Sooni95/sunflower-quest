// 모든 게임플레이 수치의 단일 소스. 밸런싱 시 이 파일만 수정한다.

// 스폰 간격은 "박진감 리밸런스"에서 전 단계 35~40% 단축 (체감 속도 우선).
// 총 플레이 시간은 pointsToNext 상향으로 §7-3 목표 곡선(~95분)에 재보정.
export const STAGES = [
  {
    id: 1,
    nameKey: 'stage.1.name',
    spawnInterval: 800,      // ms (1300 → 800)
    maxConcurrent: 4,
    lifetime: 2500,          // ms
    witheredRatio: 0.10,
    basePoints: 1,
    pointsToNext: 30,        // 1단계는 빠른 인트로 유지
  },
  {
    id: 2,
    nameKey: 'stage.2.name',
    spawnInterval: 700,      // 1200 → 700
    maxConcurrent: 5,
    lifetime: 2200,
    witheredRatio: 0.15,
    basePoints: 2,
    pointsToNext: 1000,
  },
  {
    id: 3,
    nameKey: 'stage.3.name',
    spawnInterval: 600,      // 1000 → 600
    maxConcurrent: 6,
    lifetime: 2000,
    witheredRatio: 0.20,
    basePoints: 5,           // 4 → 5 (스폰 가속에 맞춰 수입 곡선 상향)
    pointsToNext: 5500,
  },
  {
    id: 4,
    nameKey: 'stage.4.name',
    spawnInterval: 520,      // 800 → 520
    maxConcurrent: 7,
    lifetime: 1800,
    witheredRatio: 0.25,
    basePoints: 12,          // 8 → 12 (% 페널티 대비 수입이 밀리면 후반 진행이 멈추는 절벽 방지)
    pointsToNext: 21000,
  },
  {
    id: 5,
    nameKey: 'stage.5.name',
    spawnInterval: 450,      // 700 → 450
    maxConcurrent: 8,
    lifetime: 1500,
    witheredRatio: 0.30,
    basePoints: 30,          // 15 → 30
    pointsToNext: 85000,
  },
  {
    id: 6,
    nameKey: 'stage.6.name',
    spawnInterval: 400,      // 600 → 400
    maxConcurrent: 9,
    lifetime: 1300,
    witheredRatio: 0.35,
    basePoints: 60,          // 25 → 60
    pointsToNext: Infinity, // 최종 단계, 보스전으로만 진행
  },
];

export const PENALTY_RATIO = 0.05;   // 시든 꽃 탭 시 현재 포인트의 5% 감소 (기본값)
export const PENALTY_RATIO_HALVED = 0.025; // §7-3 3단계 A 선택 시 적용
export const PENALTY_MIN = 10;       // 페널티 최소값

export const FIELD_EDGE_MARGIN_RATIO = 0.10;  // 화면 가장자리 10% 여백 제외
export const MIN_SPAWN_DISTANCE_RATIO = 0.15; // 직전 스폰 위치와 최소 거리(필드 대각선 대비 비율)
export const MAX_SPAWN_POSITION_ATTEMPTS = 20; // 최소 거리 조건을 만족하는 위치를 찾기 위한 재시도 상한

export const FLOATING_TEXT_DURATION = 700;   // ms
export const SHAKE_DURATION = 200;           // ms, §5 화면 흔들림 + 붉은 플래시

// UI 연출 타이밍 (전부 애니메이션/전환 표시 시간, 게임플레이 수치 아님)
export const HARVEST_REMOVE_DELAY = 150;        // ms, 수확 팝 애니메이션 후 엔티티 제거
export const EVOLUTION_TOAST_DURATION = 2400;   // ms
export const BOSS_ENTER_FLASH_DURATION = 700;   // ms
export const BOSS_INTRO_TOAST_DURATION = 2600;  // ms
export const BOSS_DEFEAT_TO_ENDING_DELAY = 1200; // ms, 보스 격파 연출 후 엔딩 전환까지 텀
export const DEBUG_POINTS_INCREMENT = 1000;     // ?debug=1 치트 버튼 지급량

// 콤보: 노 미스 10회마다 배율 ×1.1 누적, 실수 시 리셋
export const COMBO_STEP = 10;
export const COMBO_STEP_MULTIPLIER = 1.1;
export const COMBO_CAP_DEFAULT = 2.0;
export const COMBO_CAP_FARMER = 3.0; // §7-3 5단계 농부형 선택 시 상한 상향

export const AUTO_HARVEST_INTERVAL_STAGE2 = 3000; // ms, 새싹 B 선택 (1개/3초)
export const AUTO_HARVEST_INTERVAL_STAGE5_FARMER = 1000; // ms, 2차진화 농부 B 선택 (1개/1초)

export const HARVEST_BONUS_MULTIPLIER = 1.5; // §7-3 2단계 A 선택 (+50%)

export const FIELD_EXPANSION_BONUS = 2; // §7-3 3단계 B 선택 (동시 등장 +2)

export const WARRIOR_BOSS_DAMAGE_BONUS = 15; // §7-3 5단계 전사 A 선택 (보스전 탭당 데미지 +15)
export const WARRIOR_BOSS_HEAL_REDUCTION = 0.5; // §7-3 5단계 전사 B 선택 (보스 회복량 절반)

// 4단계(해바라기) 대분기. 히든 태양형은 실력과 무관하게 확률로 세 번째 카드에 등장한다.
export const BRANCHES = {
  WARRIOR: 'warrior',
  FARMER: 'farmer',
  SUN: 'sun',
};

export const SUN_BRANCH_CHANCE = 0.10; // 4단계 도달 시 히든 태양형 카드 등장 확률

// 진화 시 제시하는 선택지. key = 진입하는 STAGES 인덱스(0-based).
// 4단계(index 3)는 대분기 자체라 branch 선택으로 처리하고,
// 5단계(index 4)는 3단계에서 고른 분기(branch)에 따라 선택지가 달라진다.
export const EVOLUTION_CHOICES = {
  1: [
    { id: 'harvestBonus', labelKey: 'choice.stage2.a', effect: 'harvestBonus' },
    { id: 'autoHarvestSlow', labelKey: 'choice.stage2.b', effect: 'autoHarvestSlow' },
  ],
  2: [
    { id: 'penaltyHalved', labelKey: 'choice.stage3.a', effect: 'penaltyHalved' },
    { id: 'fieldExpansion', labelKey: 'choice.stage3.b', effect: 'fieldExpansion' },
  ],
  3: {
    branchChoice: true,
    options: [
      { id: BRANCHES.WARRIOR, labelKey: 'choice.stage4.warrior' },
      { id: BRANCHES.FARMER, labelKey: 'choice.stage4.farmer' },
      { id: BRANCHES.SUN, labelKey: 'choice.stage4.sun', hidden: true },
    ],
  },
  4: {
    [BRANCHES.WARRIOR]: [
      { id: 'warriorAttack', labelKey: 'choice.stage5.warrior.a', effect: 'warriorAttack' },
      { id: 'warriorDefense', labelKey: 'choice.stage5.warrior.b', effect: 'warriorDefense' },
    ],
    [BRANCHES.FARMER]: [
      { id: 'comboCapUp', labelKey: 'choice.stage5.farmer.a', effect: 'comboCapUp' },
      { id: 'autoHarvestFast', labelKey: 'choice.stage5.farmer.b', effect: 'autoHarvestFast' },
    ],
    // 태양형은 보스전이 없는 대화 엔딩 루트라 농부형 선택지를 재사용한다 (사용자 확인 완료).
    [BRANCHES.SUN]: [
      { id: 'comboCapUp', labelKey: 'choice.stage5.sun.a', effect: 'comboCapUp' },
      { id: 'autoHarvestFast', labelKey: 'choice.stage5.sun.b', effect: 'autoHarvestFast' },
    ],
  },
};

// §7-5 보스전
export const BOSS_MAX_HP = 3000;
export const BOSS_BASE_DAMAGE = 10;
export const BOSS_BRANCH_DAMAGE_BONUS = {
  [BRANCHES.WARRIOR]: 7,
  [BRANCHES.FARMER]: 2,
};
export const BOSS_WITHER_HEAL_RATIO = 0.02; // 시든 꽃 탭 시 보스 HP 회복 비율 (보스전 필드는 6단계 스폰 파라미터를 그대로 재사용)

export const PLAYTIME_SAVE_INTERVAL_MS = 5000; // 누적 플레이 시간 저장 주기

// §7-4 해바라기의 혼잣말: 누적 수확 횟수 마일스톤
export const MONOLOGUE_THRESHOLDS = [50, 100, 200, 400, 700, 1000];
export const MONOLOGUE_DISPLAY_DURATION = 3000; // ms

export const SAVE_KEY = 'sunflowerQuest.save';
export const LANG_KEY = 'sunflowerQuest.lang';
export const SUPPORTED_LANGS = ['ko', 'en', 'ja'];

// §7-2 페이크 패턴 (4단계부터 변신형, 5단계부터 위장형)
export const FAKE_PATTERN_REVEAL_WITHER_DELAY = 500; // 변신형: 해바라기 → 시든 꽃 (0.5초 후)
export const FAKE_PATTERN_REVEAL_FLOWER_DELAY = 700; // 위장형: 시든 꽃 → 해바라기 (0.7초 후)
export const FAKE_PATTERN_REVEAL_WITHER_MIN_STAGE_ID = 4; // 변신형 등장 시작 단계 (해바라기)
export const FAKE_PATTERN_REVEAL_FLOWER_MIN_STAGE_ID = 5; // 위장형 등장 시작 단계 (2차 진화)
export const FAKE_PATTERN_CHANCE = 0.25; // 대상 슬롯 중 페이크 패턴으로 전환될 확률

// M5 밸런싱 시뮬레이션 가정치 (?debug=1 전용, 실제 플레이에는 영향 없음)
export const SIM_TAPS_PER_SECOND = 2.5; // 가정: 숙련 플레이어의 평균 초당 탭 수
export const SIM_MISS_RATE = 0.05; // 가정: 실수로 시든 꽃을 탭할 확률
export const SIM_TARGET_TOTAL_MINUTES = 95; // §7-3 목표 곡선 (1→6단계 + 보스전)
export const SIM_TARGET_TOLERANCE_MINUTES = 15;

// 위험도 / 게임오버 (필드 단계 전용, 보스전·대화 씬에는 적용 안 함)
export const DANGER_PER_MISS = 20;              // 시든 꽃 탭 1회당 위험도 상승분
export const DANGER_DECAY_PER_HARVEST = 4;      // 정상 수확 1회당 위험도 감소분
export const DANGER_PASSIVE_DECAY_PER_TICK = 1; // 가만히 있어도 주기마다 자연 감소
export const DANGER_PASSIVE_DECAY_INTERVAL_MS = 1000;
export const MAX_DANGER = 100;                  // 이 값에 도달하면 게임오버
export const DANGER_WARNING_THRESHOLD = 50;      // 최초로 이 값을 넘으면 경고 토스트 1회 노출
export const DANGER_SPEED_UP_FACTOR = 0.5;      // 위험도 100%일 때 스폰 간격을 최대 몇 % 단축할지
export const MIN_EFFECTIVE_SPAWN_INTERVAL = 150; // 스폰 간격 가속(위험도+진행도 합산)의 하한선 (ms)

// 단계 내 진행 가속: 다음 진화에 가까워질수록 스폰 간격이 점점 짧아진다 (진화 직전 최대 55% 단축)
export const STAGE_PROGRESS_SPEED_UP_FACTOR = 0.55;
export const MAX_DANGER_DARKEN_OPACITY = 0.75;   // 위험도 100%일 때 암전 오버레이 최대 불투명도

// 파워업 (⭐ 판정 범위 확대 아이템)
export const POWERUP_SPAWN_CHANCE = 0.03;    // 스폰 시도마다 파워업으로 대체될 확률 (필드에 파워업이 없을 때만)
export const POWERUP_LIFETIME = 1200;        // ms, 놓치면 사라짐
export const POWERUP_BUFF_DURATION = 5000;   // ms, 판정 범위 확대 지속시간
export const POWERUP_DANGER_RELIEF = 15;     // 파워업 습득 시 위험도 즉시 감소분
export const POWERUP_HIT_PADDING = 18;       // px, 버프 중 엔티티 판정 영역에 추가되는 여백

// 황금 해바라기 (초단명 고득점 — 순간 판단 압박)
export const GOLDEN_SPAWN_CHANCE = 0.02;     // 스폰 시도마다 황금으로 대체될 확률 (필드에 황금이 없을 때만)
export const GOLDEN_LIFETIME = 800;          // ms, 아주 짧음 — 놓치면 그대로 증발
export const GOLDEN_POINT_MULTIPLIER = 10;   // 기본 수확 포인트 대비 배율

// 사운드 / 진동 / 긴장 연출
export const SOUND_MUTE_KEY = 'sunflowerQuest.muted'; // 음소거 설정 저장 키
export const HEARTBEAT_DANGER_THRESHOLD = 50; // 위험도가 이 값 이상이면 심장박동 + 붉은 비네트 시작
export const HEARTBEAT_BPM = 100;             // 심장박동 사운드/비네트 맥동 속도
export const COMBO_PITCH_STEP = 0.03;         // 수확음 음정: 콤보 1회당 상승 배율 (semitone 근사)
export const COMBO_PITCH_MAX = 2.0;           // 수확음 음정 상한 (기본 주파수 대비 배수)
export const VIBRATE_HARVEST_MS = 15;         // 수확 시 짧은 햅틱
export const VIBRATE_MISS_PATTERN = [60, 40, 60];   // 실수 시 묵직한 이중 진동
export const VIBRATE_GAMEOVER_PATTERN = [200, 80, 200, 80, 400]; // 게임오버

// §7-2d 필드 이벤트 (M7 P1 — DESIGN-M7.md 참고)
export const EVENT_TYPES = {
  GOLDEN_RUSH: 'goldenRush',
  WITHER_STORM: 'witherStorm',
  GUST: 'gust',
};

export const EVENT_MIN_STAGE_ID = 2; // 2단계부터 이벤트 발생
export const EVENT_INTERVAL_MIN_MS = 40000; // 이벤트 종료 후 다음 이벤트까지 최소 대기
export const EVENT_INTERVAL_MAX_MS = 90000; // 최대 대기
export const EVENT_WARNING_MS = 1000;        // 예고 배너 노출 시간 (발동 1초 전)

// 종류는 균등 가중치 (전부 1) — 특정 이벤트를 더 자주 내고 싶으면 이 값만 조정
export const EVENT_WEIGHTS = {
  [EVENT_TYPES.GOLDEN_RUSH]: 1,
  [EVENT_TYPES.WITHER_STORM]: 1,
  [EVENT_TYPES.GUST]: 1,
};

// A-1 황금 러시: 전량 황금 스폰 + 스폰 가속
export const EVENT_GOLDEN_RUSH_DURATION_MS = 5000;
export const EVENT_GOLDEN_RUSH_SPAWN_FACTOR = 0.5; // 스폰 간격에 곱함 (0.5 = 50% 단축)

// A-2 시든 폭풍: 위기 이벤트, 노 미스 클리어 시 보상
export const EVENT_STORM_DURATION_MS = 7000;
export const EVENT_STORM_WITHERED_RATIO = 0.8;
export const EVENT_STORM_SPAWN_FACTOR = 0.7; // 30% 단축
export const EVENT_STORM_CLEAR_DANGER_RELIEF = 20;
export const EVENT_STORM_CLEAR_BONUS_MULTIPLIER = 20; // 클리어 보너스 = 현재 단계 basePoints × 이 값

// A-3 돌풍: 이동 개체 + 포인트 배율
export const EVENT_GUST_DURATION_MS = 6000;
export const EVENT_GUST_POINT_MULTIPLIER = 1.5;
export const EVENT_GUST_AMPLITUDE_PX = 40; // 좌우 진폭
export const EVENT_GUST_PERIOD_MS = 1400;  // 왕복 주기
