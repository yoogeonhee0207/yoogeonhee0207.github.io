"""게임 저장소의 소설 원고를 블로그 소설 페이지로 옮긴다.

사용법 (블로그 폴더에서):
    python3 scripts/import-story.py ../LanternKeeper/docs/story

원고 `00_prologue.md` ~ `06_epilogue.md`의 맨 위 제목 줄(`# 프롤로그 — 꺼지는 불`)을
앞머리(order·label·title·chars)로 바꿔 `src/story/lanternkeeper/`에 쓴다.
본문은 손대지 않는다. README.md(쓰는 규칙·설정 메모)는 옮기지 않는다.
원고를 고친 뒤 다시 돌리면 블로그 쪽도 같아진다.
"""
import re
import sys
from pathlib import Path

src = Path(sys.argv[1] if len(sys.argv) > 1 else "../LanternKeeper/docs/story")
out = Path(__file__).resolve().parent.parent / "src/story/lanternkeeper"
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
