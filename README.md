# yoogeonhee.dev

yoogeonhee의 게임 개발 블로그. 게임마다 홈 · 소설 · 블로그 · 소개가 따로 있고, 전체 홈과 `/games/`에서 모아 봐요 (지금 게임은 **등불지기** 하나). [Astro](https://astro.build)로 만들고 GitHub Pages로 배포해요.

주소: https://yoogeonhee0207.github.io

## 구조

```
src/
  data/site.json            이름·소개·기술·링크·메일
  data/games/<slug>.json    게임 하나 = 파일 하나 (카드·상세 페이지 자동 생성)
  data/commits/<slug>.json  게임 저장소 커밋 기록 (자동 생성, 직접 고치지 않음)
  posts/<slug>/*.md         그 게임 블로그 글 (파일 하나 = 글 하나. posts/*.md 는 게임에 속하지 않는 글)
  story/<slug>/*.md         그 게임 소설 (scripts/import-story.py가 만듦, 직접 고치지 않음)
  pages/                    전체 홈·게임 목록·전체 블로그·만든 사람 소개
  pages/games/[slug]/       게임 구역: 홈 · blog/ · story/ · about/ (게임마다 자동 생성)
  components/  layouts/  lib/data.js  styles/global.css
public/
  games/<slug>/art/         게임 표지·캐릭터 그림
  games/<slug>/play/        Unity WebGL 빌드 (넣으면 사이트에서 바로 플레이)
scripts/fetch-commits.mjs   커밋 기록 가져오기
.github/workflows/deploy.yml  push·매일 자정·수동·게임 저장소 신호 → 빌드·배포
```

## 자주 하는 일

**글 쓰기**: `src/posts/_글쓰기-예시.md`를 복사해 `src/posts/<게임 slug>/글-주소.md`로 저장, `draft: true` 지우고 push. 그 게임 블로그(`/games/<slug>/blog/글-주소/`)와 전체 블로그 목록에 나와요. 게임에 속하지 않는 글은 `src/posts/글-주소.md` (주소 `/blog/글-주소/`).

**게임 안의 게임(모드·장르) 추가**: `src/data/games/lanternkeeper.json`의 `places`에 한 줄 추가 — `title`(마을의 입구 이름), `kind`(어떤 게임인지), `badge`, `state`(`open` 플레이 가능 / `planned` 예정, 점선 카드), `color`, `text`, `detail`. 게임 페이지 "마을에서 갈 수 있는 곳"과 홈 카드에 같이 나와요. 칸 제목·소개는 `hub`, 세계관 요약은 `world.lines`.

**세계관 글**: 게임 저장소의 설정 문서는 비공개라 그대로 옮기지 않아요. 뼈대만 짧게 다시 쓰고, 보스의 정체와 엔딩은 적지 않아요.

**새 게임 추가**: `src/data/games/<slug>.json`을 하나 더 두면 (등불지기 것을 본떠서, `order`는 다음 번호) 그 게임 구역이 통째로 생겨요 — 홈 `/games/<slug>/`, 블로그 `/games/<slug>/blog/`, 소개 `/games/<slug>/about/` (`gallery`가 있으면 에셋 `/games/<slug>/assets/`). 그 구역 안에서는 맨 위 메뉴 아래에 그 게임 메뉴 줄이 하나 더 붙어요. 그림은 `public/games/<slug>/art/`, 글은 `src/posts/<slug>/`, 소설이 있으면 아래 `import-story.py`로 옮기고 JSON에 `story`(제목 `title`, 소개 문장 `lead`, 안내 `note`)를 적어요. 전체 홈의 게임 목록에도 한 줄이 저절로 늘어요.

**게임 상태 바꾸기**: 게임 JSON의 `status`를 `개발 중` / `데모` / `출시` 중 하나로.
- `개발 중`: 플레이 화면 대신 "테스트 참여 문의"
- `데모`·`출시` + `webgl` 경로가 있으면: ▶ 버튼으로 페이지 안에서 바로 플레이

**Unity WebGL 빌드 넣기**
1. Unity → Build Profiles → Web. Player Settings → Publishing Settings에서 **Compression Format: Gzip + Decompression Fallback 켜기** (또는 Disabled). GitHub Pages는 압축 헤더를 보내지 않아 그대로 두면 로딩이 멈춰요.
2. 빌드 결과 폴더 전체를 `public/games/<slug>/play/`에 복사 (`index.html`, `Build/`, `TemplateData/`).
3. 게임 JSON에 `"webgl": "/games/<slug>/play/index.html"`, `status`를 `데모` 또는 `출시`로.
4. 파일 하나가 100MB를 넘으면 GitHub에 올라가지 않아요. 넘으면 itch.io에 올리고 `itch`에 주소만.

**위 과정을 한 번에: `scripts/publish-webgl.sh`**
```
scripts/publish-webgl.sh <slug> <Unity 프로젝트 폴더> [옵션]
scripts/publish-webgl.sh lanternkeeper ../LanternKeeper --pre-method SpriteLibraryBuilder.Build
```
버전 판단 → Unity batchmode 빌드 → `public/games/<slug>/play/` 복사 → 게임 JSON의 `webgl`·`build` 설정 → 커밋·push까지 해요.
- 버전은 `v0.큰수정.작은수정`. 게임 저장소의 git 기록 전체에서 계산해요 (파일에 적지 않음): main에 들어온 PR 머지(또는 직접 커밋)마다 `feat:`이 들어 있으면 큰 수정(가운데 +1), `fix:`·`data:`·`asset:` 등만 있으면 작은 수정(끝자리 +1), `docs:`·`tool:`뿐이면 그대로. 정식 출시는 게임 저장소에 태그 `v1.0.0`을 붙이면 거기서부터 다시 세요. 빌드 번호는 올릴 때마다 +1. 게임 화면과 게임 페이지 "빌드" 줄에 같이 보여요.
- Unity 에디터가 그 프로젝트를 열고 있으면 멈춰요. 에디터를 닫고 실행.
- 빌드할 때 Unity가 바꿔 놓는 `ProjectSettings/UnityConnectSettings.asset`은 끝나고 자동으로 되돌려요 (빌드 전에 이미 고쳐져 있었으면 그대로 둬요).
- `status`는 바꾸지 않아요. `개발 중`이면 ▶ 버튼은 안 나오지만, push한 빌드는 `/games/<slug>/play/` 주소를 아는 사람이면 열 수 있어요.
- 100MB를 넘는 파일이 있으면 복사 전에 멈추고 알려줘요.
- 복사한 `index.html`의 `Build/` 파일 주소 끝에 `?v=<빌드 번호>`를 붙여요. 파일 이름이 매번 같아서, 붙이지 않으면 브라우저나 아이폰 홈 화면 앱이 예전 파일과 새 파일을 섞어 불러와 게임이 안 열릴 수 있어요. 게임 페이지의 게임 주소에도 같은 번호가 붙어요.
- `--skip-build`는 게임 폴더 `Builds/WebGL`에 있는 것을 그대로 올려요. 게임 세션이 확인용 테스트 빌드를 거기 만들어 두었을 수 있으니(빌드 번호 0) 올리기 전에 `Builds/WebGL/build.json`을 확인해요.
- 옵션: `--skip-build`(이미 있는 빌드 사용), `--no-push`(커밋까지만), `--no-commit`(복사까지만), `--method`·`--pre-method`·`--out`(게임마다 다른 빌드 메서드·결과 폴더). 자세한 건 스크립트 맨 위 설명.

**게임 페이지 "에셋" 칸: `scripts/make-gallery.py`**
```
../.venv/bin/python scripts/make-gallery.py lanternkeeper ../LanternKeeper/Assets/Art --zones catacomb,forest,cave,corridor,castle --own village,hub
```
게임 그림 폴더의 png를 파일 이름 앞머리(`char_`·`enemy_` / `tile_`·`prop_` / `icon_`·`weapon_`·`proj_`·`obj_`·`pickup_` / `fx_` / `ui_`, 보스 `boss_`)로 나눠 `public/games/<slug>/art/gallery_*.webp`를 만들어요. `--own`에 적은 이름(마을)의 타일·소품은 `gallery_village.webp`로 따로 한 장. `boss_`는 `gallery_bosses.webp`에 보스마다 한 줄(자세 그림 포함), `obj_`(소환수)는 아이콘·무기 모음, `ui_`는 `gallery_ui.webp`. 어느 모음에도 안 들어간 그림이 있으면 끝에 이름을 알려 줘요(새 앞머리가 생기면 스크립트에 추가). 게임 JSON의 `gallery`(제목·그림·크기·설명)와 `galleryNote`는 직접 적어요. 모음 그림은 게임 구역의 에셋 페이지(`/games/<slug>/assets/`)에 나오고, `gallery`가 없는 게임은 그 페이지와 메뉴 칸이 생기지 않아요. 게임 그림이 바뀌면 다시 실행하고, 출력에 나온 크기가 달라졌으면 `gallery`의 `width`·`height`도 고쳐요.

**소설: `scripts/import-story.py <게임 slug> <원고 폴더>`**
```
python3 scripts/import-story.py lanternkeeper ../LanternKeeper/docs/story
```
게임 저장소의 원고 `00_prologue.md`~`06_epilogue.md`를 `src/story/<게임 slug>/`로 옮겨요. 첫 줄 `# 프롤로그 — 꺼지는 불`이 앞머리(편 이름·제목·글자 수)가 되고 본문은 그대로예요. 목차는 `/games/<slug>/story/`, 편마다 `/games/<slug>/story/<원고 이름>/`. 원고가 없는 게임은 메뉴에 소설 칸이 나오지 않아요. 원고를 고치면 다시 실행해요(옮긴 파일은 손으로 고치지 않음). 게임 페이지 세계관 칸 아래 링크는 게임 JSON `world.story`.

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

게임 페이지 "개발 기록"은 두 칸으로 나뉘어요. 블로그에 올린 빌드(게임 JSON의 `build.rev`) 뒤에 쌓인 커밋은 **개발 중**, 그 전 것은 **v… · 빌드 N에 포함**. `scripts/publish-webgl.sh`로 새 빌드를 올리면 경계가 저절로 옮겨져요. 올린 뒤 새 커밋이 없으면 나누지 않고 한 목록으로 보여요.
주요 단계 표시는 게임 JSON의 `milestones`에 `"커밋 메시지": "표시 이름"`으로.

## 실행

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # dist/ 에 사이트 생성
```
