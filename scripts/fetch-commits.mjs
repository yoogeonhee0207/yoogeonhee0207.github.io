// 게임 저장소의 커밋 기록을 가져와 src/data/commits/<slug>.json 으로 저장합니다.
// 코드는 가져오지 않고, 커밋 메시지·날짜만 저장해요.
//
// 사용법
//   GitHub에서:   GAME_REPO_TOKEN=토큰 node scripts/fetch-commits.mjs
//   내 컴퓨터에서: node scripts/fetch-commits.mjs --local lanternkeeper=../LanternKeeper
//                (게임 저장소를 클론해 둔 폴더에서 git log 로 읽음, 토큰 필요 없음)
//
// 토큰이 없거나 가져오기에 실패하면 기존 파일을 그대로 둡니다 (사이트 빌드는 계속됨).

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const GAMES_DIR = path.join(ROOT, 'src/data/games');
const OUT_DIR = path.join(ROOT, 'src/data/commits');
const MAX_COMMITS = 300;

const kstDate = (iso) =>
  new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 10);

// "feat: 보스 추가" → { type: 'feat', msg: '보스 추가' }
const parse = (subject) => {
  const m = subject.match(/^([a-zA-Z]+)(\([^)]*\))?!?:\s*(.+)$/);
  return m ? { type: m[1].toLowerCase(), msg: m[3].trim() } : { type: 'etc', msg: subject.trim() };
};

async function fromGitHub(repo, token) {
  const out = [];
  for (let page = 1; page <= Math.ceil(MAX_COMMITS / 100) + 2 && out.length < MAX_COMMITS; page++) {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=100&page=${page}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const list = await res.json();
    if (!list.length) break;
    for (const c of list) {
      if (c.parents.length > 1) continue; // merge 커밋 제외
      const subject = c.commit.message.split('\n')[0];
      out.push({ sha: c.sha.slice(0, 7), date: kstDate(c.commit.author.date), ...parse(subject) });
    }
  }
  return out;
}

function fromLocal(dir) {
  const log = execFileSync('git', ['-C', dir, 'log', '--no-merges', '--format=%h%x09%aI%x09%s', '-n', String(MAX_COMMITS)], {
    encoding: 'utf8',
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
    commits = commits.slice(0, MAX_COMMITS);
    const data = { repo: game.repo, updatedAt: new Date().toISOString(), total: commits.length, commits };
    await writeFile(path.join(OUT_DIR, `${game.slug}.json`), JSON.stringify(data, null, 1) + '\n');
    console.log(`[commits] ${game.slug}: 커밋 ${commits.length}개 저장`);
  } catch (err) {
    console.warn(`[commits] ${game.slug}: 가져오기 실패 — 기존 기록 유지\n  ${err.message}`);
  }
}
