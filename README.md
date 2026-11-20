# yoogeonhee.dev

yoogeonhee의 게임 개발 블로그 · 포트폴리오. [Astro](https://astro.build)로 만들고 GitHub Pages로 배포해요.

주소: https://yoogeonhee0207.github.io

## 구조

```
src/
  data/site.json            이름·소개·기술·링크·메일
  data/games/<slug>.json    게임 하나 = 파일 하나 (카드·상세 페이지 자동 생성)
  data/commits/<slug>.json  게임 저장소 커밋 기록 (자동 생성, 직접 고치지 않음)
  posts/*.md                블로그 글 (파일 하나 = 글 하나)
  pages/                    페이지 (홈·게임·블로그·소개)
  components/  layouts/  lib/data.js  styles/global.css
public/
  games/<slug>/art/         게임 표지·캐릭터 그림
  games/<slug>/play/        Unity WebGL 빌드 (넣으면 사이트에서 바로 플레이)
scripts/fetch-commits.mjs   커밋 기록 가져오기
.github/workflows/deploy.yml  push·매일 자정·수동·게임 저장소 신호 → 빌드·배포
```

## 자주 하는 일

**글 쓰기**: `src/posts/_글쓰기-예시.md`를 복사해 `src/posts/글-주소.md`로 저장, `draft: true` 지우고 push.

**게임 추가**: `src/data/games/lanternkeeper.json`을 복사해 새 slug로 저장 → 그림은 `public/games/<slug>/art/`. 게임 저장소가 있으면 `repo`에 `소유자/이름`.

**게임 상태 바꾸기**: 게임 JSON의 `status`를 `개발 중` / `데모` / `출시` 중 하나로.
- `개발 중`: 플레이 화면 대신 "테스트 참여 문의"
- `데모`·`출시` + `webgl` 경로가 있으면: ▶ 버튼으로 페이지 안에서 바로 플레이

**Unity WebGL 빌드 넣기**
1. Unity → Build Profiles → Web. Player Settings → Publishing Settings에서 **Compression Format: Gzip + Decompression Fallback 켜기** (또는 Disabled). GitHub Pages는 압축 헤더를 보내지 않아 그대로 두면 로딩이 멈춰요.
2. 빌드 결과 폴더 전체를 `public/games/<slug>/play/`에 복사 (`index.html`, `Build/`, `TemplateData/`).
3. 게임 JSON에 `"webgl": "/games/<slug>/play/index.html"`, `status`를 `데모` 또는 `출시`로.
4. 파일 하나가 100MB를 넘으면 GitHub에 올라가지 않아요. 넘으면 itch.io에 올리고 `itch`에 주소만.

## 커밋 기록 자동 연동

게임 저장소는 비공개라서 토큰이 필요해요. 커밋 메시지·날짜만 가져오고 코드는 가져오지 않아요.

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token
   - Repository access: **Only select repositories → LanternKeeper**
   - Permissions: **Contents: Read-only** (Metadata는 자동)
2. 이 저장소 → Settings → Secrets and variables → Actions → New repository secret
   - Name: `GAME_REPO_TOKEN`, Secret: 위 토큰
3. Actions 탭 → 블로그 배포 → Run workflow

토큰이 없으면 저장소에 들어 있는 `src/data/commits/*.json`을 그대로 써요.
게임 저장소에 push할 때마다 바로 갱신하려면 `docs/game-repo-notify.yml` 안내를 따라 하세요.

내 컴퓨터에서 직접 갱신: `node scripts/fetch-commits.mjs --local lanternkeeper=../LanternKeeper`

커밋 메시지는 `feat: …` / `fix: …` / `asset: …` / `docs: …` 형식으로 쓰면 종류별로 걸러 볼 수 있어요.
주요 단계 표시는 게임 JSON의 `milestones`에 `"커밋 메시지": "표시 이름"`으로.

## 실행

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # dist/ 에 사이트 생성
```
