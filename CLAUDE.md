# CLAUDE.md — yoogeonhee.dev 블로그

사용자: yoogeonhee (한국어로 대답). Unity로 게임을 만드는 1인 개발자. 이 저장소는 게임 **등불지기** 하나를 다루는 개발 블로그 (2026-11-21 개편 — 등불지기가 마을 등마루에서 여러 모드·장르로 들어가는 게임이 되어, 게임을 나열하는 구조를 버림).

## 핵심 원칙
- 등불지기의 정보는 `src/data/games/lanternkeeper.json` 하나에 모은다. 게임 안의 모드·장르는 `places`에 한 줄씩(마을의 입구 하나 = 카드 하나), 세계관 요약은 `world`. 페이지·카드는 데이터에서 자동 생성된다. 메뉴·홈은 `featured` 게임 하나만 보여 주고 `/games/`는 그 페이지로 넘어간다.
- `src/data/commits/*.json`은 `scripts/fetch-commits.mjs`가 만드는 파일. 손으로 고치지 않는다.
- 게임 저장소(비공개 `yoogeonhee0207/LanternKeeper`)의 코드·문서 내용은 이 공개 저장소에 옮기지 않는다. 커밋 메시지·날짜, 공개해도 된다고 한 그림만. 세계관은 뼈대만 짧게 다시 써서 싣고, 보스의 정체·엔딩은 적지 않는다.
- 게임 제작에 AI를 활용했다는 표기(게임 개발은 Claude Code, 에셋 이미지는 Codex·힉스필드)는 지우지 않는다 (사용자 결정).
- 디자인: 흰 바탕 개발자 블로그, IBM Plex Sans KR + IBM Plex Mono, 강조색은 등불 호박색 `--accent` 하나. 다크 모드는 `prefers-color-scheme`로 자동. 색은 `src/styles/global.css` 변수만 쓴다.
- 게임 상태는 `개발 중` / `데모` / `출시` 세 가지. 게임 저장소의 `docs/PROGRESS.md`가 바뀌면 게임 JSON의 설명·모드 badge가 실제 진행과 맞는지 확인한다.

## 작업 끝낼 때
- `npm run build`가 성공하는지 확인하고 커밋·push (main에 push하면 자동 배포).
- 커밋 메시지는 `feat:` / `fix:` / `docs:` / `content:`(글·게임 정보) 형식, 한국어.
- 사이트 화면이 바뀌었으면 `npm run preview`로 열어 데스크톱(1280)·휴대폰(390) 폭에서 가로 스크롤이 생기지 않는지 확인.

## 자세한 사용법
README.md
