// 사이트 데이터를 한곳에서 읽어오는 도우미.
// 게임: src/data/games/*.json  ·  커밋: src/data/commits/*.json  ·  소설: src/story/<게임>/*.md
// 글: src/posts/<게임>/*.md (그 게임 블로그) · src/posts/*.md (게임에 속하지 않는 글)
import siteData from '../data/site.json';
import { loc, L, t } from './i18n.js';

const site = siteData;

const gameMods = import.meta.glob('../data/games/*.json', { eager: true, import: 'default' });
const commitMods = import.meta.glob('../data/commits/*.json', { eager: true, import: 'default' });
const postMods = import.meta.glob('../posts/**/*.md', { eager: true });

export { site };

export const games = Object.values(gameMods).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
export const gameBySlug = (slug) => games.find((g) => g.slug === slug) ?? null;

export const commitsFor = (slug) => commitMods[`../data/commits/${slug}.json`] ?? null;

// 날짜별 커밋 수 { '2026-11-20': 47 } — 기록 전체 기준 (목록 commits는 최근 300개뿐이라 숫자·잔디는 이것으로 센다)
const countByDate = (commits) => commits.reduce((m, c) => ((m[c.date] = (m[c.date] ?? 0) + 1), m), {});
export const dailyFor = (slug) => {
  const f = commitsFor(slug);
  return f?.daily ?? countByDate(f?.commits ?? []);
};
export const allDaily = games.reduce((m, g) => {
  for (const [d, n] of Object.entries(dailyFor(g.slug))) m[d] = (m[d] ?? 0) + n;
  return m;
}, {});
export const sumDaily = (daily) => Object.values(daily).reduce((a, b) => a + b, 0);

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

// 소설: src/story/<게임 slug>/*.md, 영어는 src/story/<게임 slug>/en/*.md (scripts/import-story.py가 게임 저장소 원고에서 만듦)
const storyMods = import.meta.glob('../story/*/*.md', { eager: true });
const storyEnMods = import.meta.glob('../story/*/en/*.md', { eager: true });
export const storyFor = (slug, lang = 'ko') =>
  Object.entries(lang === 'en' ? storyEnMods : storyMods)
    .filter(([p]) => p.split('/').at(lang === 'en' ? -3 : -2) === slug)
    .map(([p, m]) => ({ slug: p.split('/').pop().replace(/^\d+-/, '').replace(/\.md$/, ''), ...m.frontmatter, Content: m.Content }))
    .sort((a, b) => a.order - b.order);

// 게임 구역 메뉴 줄 (게임 이름 옆에 붙음): 게임 홈 · 소설(원고가 있을 때만) · 에셋(gallery가 있을 때만) · 블로그 · 소개
// 소설 칸은 한국어 원고가 있으면 영어 쪽에도 둔다 (영어 번역이 없으면 그 페이지가 한국어 목차를 보여 줌)
export const gameNav = (game, lang = 'ko') => {
  const base = L(lang, `/games/${game.slug}/`);
  const subs = ['story/', 'assets/', 'blog/', 'about/'].map((s) => base + s);
  return [
    { href: base, label: t(lang, 'zone.home'), not: subs },
    ...(storyFor(game.slug).length > 0 ? [{ href: base + 'story/', label: t(lang, 'zone.story') }] : []),
    ...(game.gallery?.length > 0 ? [{ href: base + 'assets/', label: t(lang, 'zone.assets') }] : []),
    { href: base + 'blog/', label: t(lang, 'zone.blog') },
    { href: base + 'about/', label: t(lang, 'zone.about') },
  ];
};

/** 게임·사이트 정보의 그 언어 모습 (src/lib/i18n.js loc) */
export const gameIn = (game, lang) => loc(game, lang);
export const siteIn = (lang) => loc(site, lang);

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

// GitHub 잔디처럼 최근 N주 × 7일 칸을 만듦 (일요일 시작). source: 커밋 배열 또는 날짜별 개수(dailyFor)
export function heatmap(source, weeks = 16) {
  const counts = Array.isArray(source) ? countByDate(source) : source;
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
  return { cols, total: sumDaily(counts), activeDays: days.length, last: days.sort().at(-1) };
}

export const daysAgo = (date, lang = 'ko') => {
  if (!date) return '';
  const diff = Math.round((new Date(kstToday()) - new Date(date)) / 86400000);
  return diff <= 0 ? t(lang, 'ago.today') : diff === 1 ? t(lang, 'ago.yesterday') : t(lang, 'ago.days', diff);
};
