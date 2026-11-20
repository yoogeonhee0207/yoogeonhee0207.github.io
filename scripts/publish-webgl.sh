#!/usr/bin/env bash
# Unity WebGL 빌드 → 블로그 public/games/<slug>/play/ 복사 → 게임 JSON의 webgl 경로 설정 → 커밋·push
#
# 사용법
#   scripts/publish-webgl.sh <slug> <Unity 프로젝트 폴더> [옵션]
#   예) scripts/publish-webgl.sh lanternkeeper ../LanternKeeper --pre-method SpriteLibraryBuilder.Build
#
# 옵션
#   --method <이름>      빌드에 쓸 -executeMethod (기본 BuildScript.BuildWebGL)
#   --pre-method <이름>  빌드 전에 먼저 실행할 -executeMethod (여러 번 쓸 수 있음)
#   --out <폴더>         프로젝트 안의 빌드 결과 폴더 (기본 Builds/WebGL)
#   --skip-build         Unity 빌드를 건너뛰고 이미 있는 결과를 그대로 씀
#   --no-push            커밋까지만 하고 push하지 않음
#   --no-commit          복사·JSON 설정까지만 하고 커밋하지 않음
#
# 알아둘 것
#   - 게임 JSON의 status는 건드리지 않는다. '개발 중'이면 블로그에 ▶ 버튼이 나오지 않는다.
#     단, push한 빌드는 /games/<slug>/play/ 주소를 아는 사람이면 누구나 열 수 있다 (공개 저장소).
#   - Unity 에디터가 그 프로젝트를 열고 있으면 batchmode 빌드가 안 되므로 멈춘다.
#   - 파일 하나가 100MB를 넘으면 GitHub에 올라가지 않으므로 복사 전에 멈춘다.
#   - Unity 위치를 못 찾으면 UNITY_PATH=/…/Unity.app/Contents/MacOS/Unity 로 알려준다.
set -euo pipefail

say()  { printf '[publish-webgl] %s\n' "$*"; }
stop() { printf '[publish-webgl] ✋ %s\n' "$*" >&2; exit 1; }

[ $# -ge 2 ] || { sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }
SLUG=$1; PROJECT_ARG=$2; shift 2

METHOD=BuildScript.BuildWebGL
PRE_METHODS=()
OUT=Builds/WebGL
SKIP_BUILD=0; DO_COMMIT=1; DO_PUSH=1
while [ $# -gt 0 ]; do
  case $1 in
    --method)     METHOD=$2; shift 2 ;;
    --pre-method) PRE_METHODS+=("$2"); shift 2 ;;
    --out)        OUT=$2; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --no-push)    DO_PUSH=0; shift ;;
    --no-commit)  DO_COMMIT=0; DO_PUSH=0; shift ;;
    *) stop "모르는 옵션: $1" ;;
  esac
done

BLOG=$(cd "$(dirname "$0")/.." && pwd)
[ -d "$PROJECT_ARG" ] || stop "프로젝트 폴더가 없습니다: $PROJECT_ARG"
PROJECT=$(cd "$PROJECT_ARG" && pwd)
GAME_JSON="$BLOG/src/data/games/$SLUG.json"
SRC="$PROJECT/$OUT"
DEST="$BLOG/public/games/$SLUG/play"
WEBGL_URL="/games/$SLUG/play/index.html"

[ -f "$GAME_JSON" ] || stop "블로그에 게임 정보가 없습니다: src/data/games/$SLUG.json (먼저 만들어 주세요)"
grep -q '"webgl"[[:space:]]*:' "$GAME_JSON" || stop "$SLUG.json에 \"webgl\" 항목이 없습니다."
[ -f "$PROJECT/ProjectSettings/ProjectVersion.txt" ] || stop "Unity 프로젝트가 아닙니다: $PROJECT"

# ── 1. Unity 빌드 ─────────────────────────────────────────────
if [ "$SKIP_BUILD" -eq 0 ]; then
  SETTINGS="$PROJECT/ProjectSettings/ProjectSettings.asset"
  FORMAT=$(sed -n 's/^ *webGLCompressionFormat: *//p' "$SETTINGS" | head -1)
  FALLBACK=$(sed -n 's/^ *webGLDecompressionFallback: *//p' "$SETTINGS" | head -1)
  # 0 Brotli / 1 Gzip / 2 Disabled. GitHub Pages는 압축 헤더를 보내지 않는다.
  if ! { [ "$FORMAT" = 2 ] || { [ "$FORMAT" = 1 ] && [ "$FALLBACK" = 1 ]; }; }; then
    stop "WebGL 압축 설정이 Gzip + Decompression Fallback이 아닙니다 (format=$FORMAT, fallback=$FALLBACK). Player Settings → Publishing Settings에서 바꿔 주세요."
  fi

  VERSION=$(sed -n 's/^m_EditorVersion: *//p' "$PROJECT/ProjectSettings/ProjectVersion.txt")
  UNITY=${UNITY_PATH:-}
  if [ -z "$UNITY" ]; then
    for c in "/Applications/Unity/Unity-$VERSION/Unity.app/Contents/MacOS/Unity" \
             "/Applications/Unity/Hub/Editor/$VERSION/Unity.app/Contents/MacOS/Unity"; do
      [ -x "$c" ] && { UNITY=$c; break; }
    done
  fi
  [ -n "$UNITY" ] && [ -x "$UNITY" ] || stop "Unity $VERSION 을 찾지 못했습니다. UNITY_PATH로 알려 주세요."

  if [ -e "$PROJECT/Temp/UnityLockfile" ] && pgrep -f "Unity.app/Contents/MacOS/Unity" >/dev/null; then
    stop "Unity 에디터가 이 프로젝트를 열고 있는 것 같습니다. 에디터를 닫고 다시 실행해 주세요."
  fi

  mkdir -p "$PROJECT/Logs"
  LOG="$PROJECT/Logs/publish-webgl.log"
  MARK=$(mktemp)
  run_unity() {
    say "Unity $VERSION: $1 실행 중… (로그: $LOG)"
    if ! "$UNITY" -batchmode -quit -projectPath "$PROJECT" -buildTarget WebGL \
          -executeMethod "$1" -logFile "$LOG"; then
      grep -E "error CS|Error:|Exception|BuildScript|Build Finished" "$LOG" | tail -15 >&2 || true
      stop "$1 실패. 위 내용과 로그를 확인해 주세요."
    fi
  }
  for m in ${PRE_METHODS[@]+"${PRE_METHODS[@]}"}; do run_unity "$m"; done
  run_unity "$METHOD"
  [ "$SRC/index.html" -nt "$MARK" ] || { rm -f "$MARK"; stop "빌드는 끝났는데 $OUT/index.html이 새로 만들어지지 않았습니다. 로그를 확인해 주세요."; }
  rm -f "$MARK"
else
  say "Unity 빌드를 건너뜁니다 (--skip-build)."
fi

[ -f "$SRC/index.html" ] || stop "빌드 결과가 없습니다: $SRC/index.html"

# ── 2. 크기 검사 ──────────────────────────────────────────────
BIG=$(find "$SRC" -type f -size +100M -exec ls -lh {} \; | awk '{print $5, $NF}')
if [ -n "$BIG" ]; then
  printf '%s\n' "$BIG" >&2
  stop "100MB를 넘는 파일이 있어 GitHub에 올릴 수 없습니다. 복사하지 않았습니다. (itch.io에 올리고 게임 JSON의 itch에 주소를 넣는 방법이 있어요)"
fi
WARN=$(find "$SRC" -type f -size +50M -exec ls -lh {} \; | awk '{print $5, $NF}')
[ -z "$WARN" ] || { say "⚠️ 50MB를 넘는 파일 (올라가긴 하지만 GitHub가 경고함):"; printf '%s\n' "$WARN"; }
say "빌드 크기: $(du -sh "$SRC" | cut -f1)"

# ── 3. 블로그로 복사 + JSON 설정 ──────────────────────────────
if [ "$DO_PUSH" -eq 1 ]; then git -C "$BLOG" pull --ff-only --quiet; fi
mkdir -p "$DEST"
rsync -a --delete --exclude .DS_Store "$SRC/" "$DEST/"
say "복사: public/games/$SLUG/play/"

WEBGL_URL="$WEBGL_URL" perl -0pi -e 's/("webgl"\s*:\s*)"[^"]*"/$1"$ENV{WEBGL_URL}"/' "$GAME_JSON"
grep -q "\"webgl\"[[:space:]]*:[[:space:]]*\"$WEBGL_URL\"" "$GAME_JSON" || stop "$SLUG.json의 webgl을 설정하지 못했습니다."
STATUS=$(sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$GAME_JSON" | head -1)
TITLE=$(sed -n 's/.*"title"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$GAME_JSON" | head -1)
say "webgl = $WEBGL_URL / status = $STATUS (바꾸지 않음)"

# ── 4. 커밋·push ──────────────────────────────────────────────
if [ "$DO_COMMIT" -eq 0 ]; then say "커밋하지 않았습니다 (--no-commit)."; exit 0; fi

PATHS=("public/games/$SLUG/play" "src/data/games/$SLUG.json")
git -C "$BLOG" add -- "${PATHS[@]}"
if git -C "$BLOG" diff --cached --quiet -- "${PATHS[@]}"; then
  say "이전 빌드와 달라진 것이 없어 커밋하지 않았습니다."
  exit 0
fi
GAME_REV=$(git -C "$PROJECT" rev-parse --short HEAD 2>/dev/null || echo "알 수 없음")
git -C "$BLOG" commit --quiet -m "content: ${TITLE:-$SLUG} WebGL 빌드 갱신 (게임 커밋 $GAME_REV)" -- "${PATHS[@]}"
say "커밋: $(git -C "$BLOG" log -1 --format='%h %s')"

if [ "$DO_PUSH" -eq 1 ]; then
  git -C "$BLOG" push --quiet
  say "push 완료. 배포가 끝나면 $WEBGL_URL 주소로 열립니다."
else
  say "push하지 않았습니다 (--no-push). 올리려면 블로그 폴더에서 git push."
fi
[ "$STATUS" = "개발 중" ] && say "status가 '개발 중'이라 블로그에 ▶ 버튼은 나오지 않습니다."
exit 0
