// 사이트 데이터를 한곳에서 읽어오는 도우미.
// 게임: src/data/games/*.json  ·  커밋: src/data/commits/*.json  ·  소설: src/story/<게임>/*.md
// 글: src/posts/<게임>/*.md (그 게임 블로그) · src/posts/*.md (게임에 속하지 않는 글)
import site from '../data/site.json';

const gameMods = import.meta.glob('../data/games/*.json', { eager: true, import: 'default' });
const commitMods = import.meta.glob('../data/commits/*.json', { eager: true, import: 'default' });
const postMods = import.meta.glob('../posts/**/*.md', { eager: true });

export { site };

export const games = Object.values(gameMods).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
export const gameBySlug = (slug) => games.find((g) => g.slug === slug) ?? null;

export const commitsFor = (slug) => commitMods[`../data/commits/${slug}.json`] ?? null;

// 모든 게임의 커밋을 날짜순(최신 먼저)으로 합침
export const allCommits = games
  .flatMap((g, gi) =>
    (commitsFor(g.slug)?.commits ?? []).map((c, i) => ({ ...c, game: g.title, slug: g.slug, _o: gi * 10000 + i })),
  )
  .sort((a, b) => (a.date === b.date ? a._o - b._o : a.date < b.date ? 1 : -1));

// 글 하나: slug(주소 끝), game(게임 slug 또는 null), url(글 주소)
// src/posts/<게임>/<글>.md → /games/<게임>/blog/<글>/  ·  src/posts/<글>.md → /blog/<글>/
export const posts = Object.entries(postMods)
  .map(([p, m]) => {
    const parts = p.replace('../posts/', '').replace(/\.md$/, '').split('/');
    const slug = parts.at(-1);
    const game = parts.length > 1 && gameBySlug(parts[0]) ? parts[0] : null;
    return { slug, game, url: game ? `/games/${game}/blog/${slug}/` : `/blog/${slug}/`, ...m.frontmatter, Content: m.Content };
  })
  .filter((p) => !p.draft)
  .sort((a, b) => new Date(b.date) - new Date(a.date));
export const postsFor = (slug) => posts.filter((p) => p.game === slug);

// 소설: src/story/<게임 slug>/*.md (scripts/import-story.py가 게임 저장소 원고에서 만듦)
const storyMods = import.meta.glob('../story/*/*.md', { eager: true });
export const storyFor = (slug) =>
  Object.entries(storyMods)
    .filter(([p]) => p.split('/').at(-2) === slug)
    .map(([p, m]) => ({ slug: p.split('/').pop().replace(/^\d+-/, '').replace(/\.md$/, ''), ...m.frontmatter, Content: m.Content }))
    .sort((a, b) => a.order - b.order);

// 게임 구역 메뉴: 게임 홈 · 소설(원고가 있을 때만) · 블로그 · 소개
export const gameNav = (game) => {
  const base = `/games/${game.slug}/`;
  const subs = ['story/', 'blog/', 'about/'].map((s) => base + s);
  return [
    { href: base, label: game.title, not: subs },
    ...(storyFor(game.slug).length > 0 ? [{ href: base + 'story/', label: '소설' }] : []),
    { href: base + 'blog/', label: '블로그' },
    { href: base + 'about/', label: '소개' },
  ];
};

export const STATUS = {
  '개발 중': 'amber',
  '데모': 'blue',
  '출시': 'green',
};

export const TYPES = {
  feat: '새 기능',
  asset: '그림·에셋',
  art: '그림·에셋',
  fix: '버그 수정',
  docs: '문서·기획',
  refactor: '정리',
  perf: '성능',
  etc: '기타',
};

export const kstToday = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 10);

export const fmtDate = (d, withYear = false) => {
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return withYear ? `${y}.${m}.${day}` : `${m}.${day}`;
};

// GitHub 잔디처럼 최근 N주 × 7일 칸을 만듦 (일요일 시작)
export function heatmap(commits, weeks = 16) {
  const counts = {};
  for (const c of commits) counts[c.date] = (counts[c.date] ?? 0) + 1;
  const today = kstToday();
  const t = new Date(today + 'T00:00:00Z');
  const start = new Date(t);
  start.setUTCDate(t.getUTCDate() - t.getUTCDay() - (weeks - 1) * 7);
  const level = (n) => (n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4);
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + w * 7 + d);
      const key = day.toISOString().slice(0, 10);
      const n = counts[key] ?? 0;
      col.push({ date: key, count: n, level: level(n), future: key > today });
    }
    cols.push(col);
  }
  const days = Object.keys(counts);
  return { cols, total: commits.length, activeDays: days.length, last: days.sort().at(-1) };
}

export const daysAgo = (date) => {
  if (!date) return '';
  const diff = Math.round((new Date(kstToday()) - new Date(date)) / 86400000);
  return diff <= 0 ? '오늘' : diff === 1 ? '어제' : `${diff}일 전`;
};
