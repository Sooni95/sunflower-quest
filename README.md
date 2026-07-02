# 🌻 해바라기 키우기 / Sunflower Quest / ひまわりクエスト

시든 꽃을 피해 해바라기를 수확하고, 매 진화마다 선택으로 나만의 빌드를 만들어 태양(보스)과 대면하는
순간 판단형 수확 + 선택 기반 진화 라이트 RPG. 이스터에그용 미니게임입니다.

An instant-judgment harvesting game with choice-driven evolution: dodge the wilted flowers,
grow your sunflower, and eventually face down the sun itself.

枯れた花を避けてひまわりを収穫し、進化のたびに選択で自分だけのビルドを作って
太陽(ボス)と対峙する、瞬間判断型ミニゲームです。

**🔗 데모 (Demo / デモ):** _TODO — GitHub Pages 배포 후 URL을 여기에 채워주세요._

**📸 스크린샷 (Screenshot / スクリーンショット):**

_TODO — 플레이 스크린샷을 `docs/screenshot.png` 등으로 추가하고 여기에 삽입하세요._

```
![gameplay](docs/screenshot.png)
```

---

## 조작법 / Controls / 操作方法

| | 한국어 | English | 日本語 |
|---|---|---|---|
| 수확 | 필드에 나타나는 🌻를 탭/클릭 | Tap/click 🌻 as it appears | 出現する🌻をタップ/クリック |
| 회피 | 🥀(시든 꽃)는 탭하지 말 것 — 포인트 감소 | Avoid tapping 🥀 (wilted flower) — loses points | 🥀(枯れた花)はタップ厳禁 — ポイント減少 |
| 진화 선택 | 조건 달성 시 모달에서 카드 탭으로 선택 | Tap a card in the modal when it appears | 条件達成時、モーダルのカードをタップして選択 |
| 언어 전환 | 우상단 🌐 버튼 탭 | Tap the 🌐 button (top-right) | 右上の🌐ボタンをタップ |
| 보스전/진 엔딩 | 최종형 도달 시 화면 하단 버튼 탭 | Tap the button at the bottom once you reach the final stage | 最終形態到達後、画面下部のボタンをタップ |

터치와 마우스를 모두 지원합니다 (PC + 모바일 브라우저).
Both touch and mouse input are supported (PC + mobile browsers).
タッチとマウス両方に対応しています(PC + モバイルブラウザ)。

---

## 기술 스택 / Tech Stack

- **바닐라 JavaScript (ES6 모듈)** — 프레임워크/빌드 도구 없음, 외부 의존성 0개
- **HTML + CSS**만 사용, 에셋은 이모지 기반 (저작권 이슈 없음)
- **localStorage**로 진행 상황·언어 설정 자동 저장
- 정적 파일만으로 구성되어 GitHub Pages에 폴더째 배포 가능

```
/
├── index.html
├── css/style.css
├── js/
│   ├── main.js        # 게임 루프, 초기화
│   ├── config.js       # 모든 게임플레이 수치 (밸런싱 단일 소스)
│   ├── state.js        # 게임 상태 + localStorage 저장/로드
│   ├── entities.js     # 해바라기 / 시든 꽃 엔티티
│   ├── evolution.js    # 진화 트리 데이터 + 선택지 로직
│   ├── ui.js            # HUD, 모달, 엔딩 화면
│   ├── input.js         # 터치/마우스 통합 입력
│   ├── i18n.js           # 언어 감지/전환/조회
│   └── lang/{ko,en,ja}.js
└── README.md
```

---

## 개발 노트 / Dev Notes

- `?debug=1` 쿼리 파라미터를 붙이면 `+1000 포인트` 치트 버튼과 `시뮬레이션 실행` 버튼(밸런싱 검증 도구, 콘솔에 단계별 도달 시간 출력)이 우하단에 나타납니다. 배포 빌드에서도 제거하지 않았습니다 — 이스터에그 게임의 이스터에그로 취급합니다.
- 목표 플레이 시간: 1회차 약 95분 내외 (config.js 수치 기준 시뮬레이션으로 검증).

**Built with [Claude Code](https://claude.com/claude-code).**
