#!/usr/bin/env python3
"""게임 그림 폴더 → 블로그 게임 페이지 '에셋' 칸에 쓰는 종류별 모음 그림.

사용법 (Pillow가 있는 파이썬으로 실행)
  ../.venv/bin/python scripts/make-gallery.py <slug> <게임 그림 폴더> [--zones a,b,c] [--own x,y]
  예) ../.venv/bin/python scripts/make-gallery.py lanternkeeper ../LanternKeeper/Assets/Art --zones catacomb,forest,cave,corridor,castle --own village,hub

하는 일
  - 그림 폴더(하위 폴더 포함)의 png를 파일 이름 앞머리로 나눠 모음 그림 4장을 만든다.
      char_·enemy_           → gallery_characters.webp  (캐릭터 움직임)
      boss_                  → gallery_bosses.webp      (보스 자세, 보스마다 한 줄)
      tile_·prop_            → gallery_tiles.webp       (타일·소품, --zones 순서로 한 줄씩)
      icon_·weapon_·proj_·obj_·pickup_ → gallery_items.webp  (아이콘·무기·소환수)
      fx_                    → gallery_effects.webp     (효과)
      ui_                    → gallery_ui.webp          (화면 UI)
  - 어느 모음에도 들어가지 않은 그림이 있으면 끝에 이름을 알려 준다 (title_ 은 표지라 제외).
      --own 에 적은 이름이 든 tile_·prop_ 는 gallery_<첫 이름>.webp 로 따로 (마을처럼 큰 그림이 많은 곳)
  - 도트가 흐려지지 않게 정수배로만 키운다. 결과는 public/games/<slug>/art/ 에 저장.
  - 게임 JSON(src/data/games/<slug>.json)의 cast 순서가 있으면 적을 그 순서로 놓는다.
  - 게임 JSON은 고치지 않는다. "gallery" 항목은 직접 적는다 (README 참고).
  - 게임 그림이 바뀌면 다시 실행하고 커밋한다.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

BG = (22, 24, 29)        # 그림 바탕 (밝은 효과 그림이 보이도록 어둡게)
MAX_W = 1100             # 한 줄 최대 폭 (키운 뒤 픽셀)
FRAME = re.compile(r"_(idle|walk|fly|move|atk|breath|open)(_.*)?$|_\d+$")


def load(folder):
    out = {}
    for p in sorted(Path(folder).rglob("*.png")):
        if "Drafts" in p.parts:
            continue
        out[p.stem] = Image.open(p).convert("RGBA")
    return out


def groups_of(names):
    """이름에서 프레임 꼬리(_idle, _walk_down_01, _03 …)를 떼고 같은 것끼리 묶는다. idle이 맨 앞."""
    g = {}
    for n in names:
        g.setdefault(FRAME.sub("", n), []).append(n)
    for k in g:
        g[k].sort(key=lambda n: (0 if "_idle" in n else 1, n))
    return g


def render(path, sections, imgs, scale):
    """sections: 줄바꿈으로 나뉘는 구역들. 구역 = 묶음들(묶음 = 그림 이름들). 폭을 넘으면 다음 줄로."""
    gap, ggap, lgap, pad = 2 * scale, 12 * scale, 8 * scale, 12 * scale
    lines = []
    for sec in sections:
        line, w = [], 0
        for grp in sec:
            if not grp:
                continue
            gw = sum(imgs[n].width * scale for n in grp) + gap * (len(grp) - 1)
            if line and w + ggap + gw > MAX_W:
                lines.append(line)
                line, w = [], 0
            w += (ggap if line else 0) + gw
            line.append(grp)
        if line:
            lines.append(line)
    if not lines:
        return False

    def line_w(line):
        return sum(sum(imgs[n].width * scale for n in g) + gap * (len(g) - 1) for g in line) + ggap * (len(line) - 1)

    def line_h(line):
        return max(imgs[n].height * scale for g in line for n in g)

    W = max(line_w(l) for l in lines) + pad * 2
    H = sum(line_h(l) for l in lines) + lgap * (len(lines) - 1) + pad * 2
    sheet = Image.new("RGBA", (W, H), BG + (255,))
    y = pad
    for line in lines:
        h, x = line_h(line), pad
        for grp in line:
            for n in grp:
                im = imgs[n].resize((imgs[n].width * scale, imgs[n].height * scale), Image.NEAREST)
                sheet.alpha_composite(im, (x, y + h - im.height))   # 바닥에 맞춰 놓는다
                x += im.width + gap
            x += ggap - gap
        y += h + lgap
    sheet.convert("RGB").save(path, lossless=True, method=6)
    print(f"  {path.name}: {W}×{H}, {path.stat().st_size // 1024}KB, 그림 {sum(len(g) for l in lines for g in l)}장")
    return True


def main():
    args = sys.argv[1:]

    def opt(name):
        if name not in args:
            return []
        i = args.index(name)
        val = args[i + 1].split(",") if i + 1 < len(args) else []
        del args[i:i + 2]
        return val

    zones, own = opt("--zones"), opt("--own")
    if len(args) != 2:
        sys.exit(__doc__)
    slug, folder = args
    root = Path(__file__).resolve().parent.parent
    out = root / "public" / "games" / slug / "art"
    out.mkdir(parents=True, exist_ok=True)
    imgs = load(folder)
    if not imgs:
        sys.exit(f"png가 없습니다: {folder}")

    used = set()

    def pick(*prefixes):
        got = [n for n in imgs if n.startswith(prefixes)]
        used.update(got)
        return got

    # 1. 캐릭터 움직임 — 주인공, 그다음 적 (게임 JSON cast 순서)
    order = []
    data = root / "src" / "data" / "games" / f"{slug}.json"
    if data.exists():
        order = [FRAME.sub("", Path(c["img"]).stem) for c in json.loads(data.read_text()).get("cast", [])]
    chars = groups_of(pick("char_", "enemy_", "boss_"))
    keys = sorted(chars, key=lambda k: (order.index(k) if k in order else len(order), k))
    render(out / "gallery_characters.webp", [[chars[k] for k in keys if not k.startswith("boss_")]], imgs, 3)
    # 보스는 따로 한 장 (대기·걷기·공격·빈틈 자세, 보스마다 한 줄), 크기가 커서 2배
    render(out / "gallery_bosses.webp", [[chars[k]] for k in keys if k.startswith("boss_")], imgs, 2)

    # 2. 타일·소품 — 구역마다 한 줄, 구역 이름이 없는 것은 마지막 줄
    def zone_of(n):
        return next((z for z in zones if f"_{z}_" in n), None)
    tp = pick("tile_", "prop_")
    if own:   # 따로 한 장: 타일 한 묶음 + 소품은 하나씩 (폭을 넘으면 줄바꿈)
        mine = [n for n in tp if any(f"_{o}_" in n for o in own)]
        tp = [n for n in tp if n not in mine]
        render(out / f"gallery_{own[0]}.webp",
               [[[n for n in mine if n.startswith("tile_")]], [[n] for n in mine if n.startswith("prop_")]], imgs, 2)
    secs = [[[n for n in tp if n.startswith("tile_") and zone_of(n) == z],
             [n for n in tp if n.startswith("prop_") and zone_of(n) == z]] for z in zones]
    secs.append([[n for n in tp if n.startswith("tile_") and not zone_of(n)],
                 [n for n in tp if n.startswith("prop_") and not zone_of(n)]])
    render(out / "gallery_tiles.webp", secs, imgs, 3)

    # 3. 아이콘·무기 — 아이콘은 10개씩, 무기·투사체·줍는 물건은 한 줄
    icons = pick("icon_")
    secs = [[icons[i:i + 10]] for i in range(0, len(icons), 10)]
    secs.append([pick("weapon_"), pick("proj_"), pick("obj_"), pick("pickup_")])
    render(out / "gallery_items.webp", secs, imgs, 4)

    # 4. 효과 — 같은 효과의 프레임끼리 묶고 작은 것부터
    fx = groups_of(pick("fx_"))
    keys = sorted(fx, key=lambda k: (max(imgs[n].width for n in fx[k]), k))
    render(out / "gallery_effects.webp", [[fx[k] for k in keys]], imgs, 2)

    # 5. 화면 UI — 버튼(눌림 포함)·틀·바·조이스틱 등, 이름 순 (누른 모양이 바로 옆에 옴)
    ui = pick("ui_")
    render(out / "gallery_ui.webp", [[[n] for n in ui]], imgs, 3)

    left = sorted(n for n in imgs if n not in used and not n.startswith("title_"))
    if left:
        print(f"  ⚠️ 모음에 안 들어간 그림 {len(left)}장: {' '.join(left)}")


if __name__ == "__main__":
    main()
