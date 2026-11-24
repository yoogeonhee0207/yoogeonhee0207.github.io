// 게임 저장소의 커밋 기록을 가져와 src/data/commits/<slug>.json 으로 저장합니다.
// 코드는 가져오지 않고, 커밋 메시지·날짜만 저장해요.
// 목록(commits)은 최근 300개까지만, 전체 수(total)와 날짜별 개수(daily)는 기록 전체를 세서 저장해요.
//
// 사용법
//   GitHub에서:   GAME_REPO_TOKEN=토큰 node scripts/fetch-commits.mjs
//   내 컴퓨터에서: node scripts/fetch-commits.mjs --local lanternkeeper=../LanternKeeper
//                (게임 저장소를 클론해 둔 폴더에서 git log 로 읽음, 토큰 필요 없음)
//
// 토큰이 없거나 가져오기에 실패하면 기존 파일을 그대로 둡니다 (사이트 빌드는 계속됨).
//
// 게임 JSON에 build.rev(블로그에 올린 빌드의 게임 커밋)가 있으면, 그 뒤에 쌓인 커밋에 dev: true 를 붙입니다.
// 게임 페이지 '개발 기록'이 이것으로 '개발 중'과 '빌드에 포함됨'을 나눠 보여 줘요.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const GAMES_DIR = path.join(ROOT, 'src/data/games');
const OUT_DIR = path.join(ROOT, 'src/data/commits');
const MAX_COMMITS = 300; // 목록으로 보여 줄 최근 커밋 수
const MAX_PAGES = 100; // 전체 기록을 셀 때 읽는 쪽수 상한 (100개씩 → 1만 개)

const kstDate = (iso) =>
  new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 10);

// "feat: 보스 추가" → { type: 'feat', msg: '보스 추가' }
const parse = (subject) => {
  const m = subject.match(/^([a-zA-Z]+)(\([^)]*\))?!?:\s*(.+)$/);
  return m ? { type: m[1].toLowerCase(), msg: m[3].trim() } : { type: 'etc', msg: subject.trim() };
};

const ghGet = async (url, token) => {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.json();
};

async function fromGitHub(repo, token) {
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const list = await ghGet(`https://api.github.com/repos/${repo}/commits?per_page=100&page=${page}`, token);
    if (!list.length) break;
    if (page === 1) out.head = list[0].sha; // 기본 브랜치의 최신 커밋 (merge 포함)
    for (const c of list) {
      if (c.parents.length > 1) continue; // merge 커밋 제외
      const subject = c.commit.message.split('\n')[0];
      out.push({ sha: c.sha.slice(0, 7), date: kstDate(c.commit.author.date), ...parse(subject) });
    }
  }
  return out;
}

// 올린 빌드(rev) 뒤에 쌓인 커밋의 짧은 sha 모음. rev가 최신이면 빈 모음.
async function devFromGitHub(repo, token, rev, head) {
  const shas = new Set();
  for (let page = 1; page <= Math.ceil(MAX_COMMITS / 100); page++) {
    const cmp = await ghGet(`https://api.github.com/repos/${repo}/compare/${rev}...${head}?per_page=100&page=${page}`, token);
    for (const c of cmp.commits ?? []) shas.add(c.sha.slice(0, 7));
    if ((cmp.commits ?? []).length < 100) break;
  }
  return shas;
}

function devFromLocal(dir, rev) {
  const out = execFileSync('git', ['-C', dir, 'rev-list', '--no-merges', '--abbrev-commit', '--abbrev=7', `${rev}..HEAD`], { encoding: 'utf8' });
  return new Set(out.trim().split('\n').filter(Boolean).map((s) => s.slice(0, 7)));
}

function fromLocal(dir) {
  const log = execFileSync('git', ['-C', dir, 'log', '--no-merges', '--format=%h%x09%aI%x09%s'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return log
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, iso, ...rest] = line.split('\t');
      return { sha: sha.slice(0, 7), date: kstDate(iso), ...parse(rest.join('\t')) };
    });
}

const localArgs = {};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--local' && args[i + 1]) {
    const [slug, dir] = args[++i].split('=');
    localArgs[slug] = path.resolve(dir);
  }
}

const token = process.env.GAME_REPO_TOKEN;
await mkdir(OUT_DIR, { recursive: true });

for (const file of (await readdir(GAMES_DIR)).filter((f) => f.endsWith('.json'))) {
  const game = JSON.parse(await readFile(path.join(GAMES_DIR, file), 'utf8'));
  if (!game.repo) continue;
  try {
    let commits;
    if (localArgs[game.slug]) commits = fromLocal(localArgs[game.slug]);
    else if (token) commits = await fromGitHub(game.repo, token);
    else {
      console.log(`[commits] ${game.slug}: 토큰(GAME_REPO_TOKEN)이 없어 건너뜀 — 기존 기록 유지`);
      continue;
    }
    const head = commits.head;
    // 기록 전체로 날짜별 개수를 센 뒤, 목록은 최근 것만 남긴다
    const total = commits.length;
    const daily = {};
    for (const c of commits) daily[c.date] = (daily[c.date] ?? 0) + 1;
    commits = commits.slice(0, MAX_COMMITS);
    let devCount = null;
    const rev = game.webgl ? game.build?.rev : null;
    if (rev) {
      try {
        const dev = localArgs[game.slug] ? devFromLocal(localArgs[game.slug], rev) : await devFromGitHub(game.repo, token, rev, head);
        commits = commits.map((c) => (dev.has(c.sha) ? { ...c, dev: true } : c));
        devCount = commits.filter((c) => c.dev).length;
      } catch (err) {
        console.warn(`[commits] ${game.slug}: 올린 빌드(${rev}) 뒤 커밋을 가리지 못함 — 나누지 않고 표시\n  ${err.message}`);
      }
    }
    const data = { repo: game.repo, updatedAt: new Date().toISOString(), total, daily, commits };
    await writeFile(path.join(OUT_DIR, `${game.slug}.json`), JSON.stringify(data, null, 1) + '\n');
    console.log(`[commits] ${game.slug}: 전체 ${total}개 · ${Object.keys(daily).length}일, 목록 ${commits.length}개 저장${devCount === null ? '' : ` (올린 빌드 뒤 ${devCount}개)`}`);
  } catch (err) {
    console.warn(`[commits] ${game.slug}: 가져오기 실패 — 기존 기록 유지\n  ${err.message}`);
  }
}
