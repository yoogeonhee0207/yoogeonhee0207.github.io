"""게임 저장소의 소설 원고를 블로그 소설 페이지로 옮긴다.

사용법 (블로그 폴더에서):
    python3 scripts/import-story.py <게임 slug> <원고 폴더>
    예) python3 scripts/import-story.py lanternkeeper ../LanternKeeper/docs/story

원고 `00_prologue.md` ~ `06_epilogue.md`의 맨 위 제목 줄(`# 프롤로그 — 꺼지는 불`)을
앞머리(order·label·title·chars)로 바꿔 `src/story/<게임 slug>/`에 쓴다.
소설 제목·소개 문장은 `src/data/games/<게임 slug>.json`의 `story`에 적는다.
본문은 손대지 않는다. README.md(쓰는 규칙·설정 메모)는 옮기지 않는다.
원고를 고친 뒤 다시 돌리면 블로그 쪽도 같아진다.
"""
import re
import sys
from pathlib import Path

if len(sys.argv) != 3:
    sys.exit("사용법: python3 scripts/import-story.py <게임 slug> <원고 폴더>")
slug_game, src = sys.argv[1], Path(sys.argv[2])
root = Path(__file__).resolve().parent.parent
if not (root / f"src/data/games/{slug_game}.json").exists():
    sys.exit(f"게임이 없습니다: src/data/games/{slug_game}.json")
out = root / "src/story" / slug_game
out.mkdir(parents=True, exist_ok=True)

files = sorted(p for p in src.glob("[0-9][0-9]_*.md"))
if not files:
    sys.exit(f"원고가 없습니다: {src}")

for old in out.glob("*.md"):
    old.unlink()

for p in files:
    text = p.read_text(encoding="utf-8")
    first, _, body = text.partition("\n")
    m = re.match(r"#\s*(.+?)\s*—\s*(.+)$", first.strip())
    if not m:
        sys.exit(f"첫 줄이 '# 이름 — 제목' 모양이 아닙니다: {p.name}")
    label, title = m.groups()
    order = int(p.name[:2])
    slug = p.stem.split("_", 1)[1]
    chars = len(re.sub(r"\s", "", re.sub(r"^#.*$", "", body, flags=re.M)))
    front = f'---\norder: {order}\nlabel: "{label}"\ntitle: "{title}"\nchars: {chars}\n---\n'
    (out / f"{order:02d}-{slug}.md").write_text(front + body.lstrip("\n"), encoding="utf-8")
    print(f"{order:02d} {label} — {title} ({chars:,}자)")
