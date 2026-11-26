// 한국어·영어 (2026-11-26). 한국어는 지금 주소 그대로, 영어는 /en/ 아래에 같은 페이지.
// 페이지 파일은 src/pages/[...lang]/ 에 하나씩 두고, lang 칸이 비면 한국어, 'en'이면 영어.
// 언어는 주소로 정한다 — 컴포넌트도 Astro.url.pathname 으로 langOf()를 부른다 (props로 넘기지 않음).
// 게임 JSON·site.json의 영어는 그 파일의 "en" 칸 (loc()가 원래 값 위에 덮음, 배열은 같은 자리끼리).
// 개발 일지는 한국어만 — 영어 목록에서는 'Korean' 표시를 달고 한국어 글로 보낸다.

export const LANGS = ['ko', 'en'];

export const langOf = (path) => (path === '/en' || path.startsWith('/en/') ? 'en' : 'ko');

/** 그 언어의 주소: L('en', '/games/') → '/en/games/' */
export const L = (lang, path) => (lang === 'en' ? `/en${path}` : path);

/** 같은 페이지의 다른 언어 주소 */
export const otherPath = (path) => (langOf(path) === 'en' ? path.replace(/^\/en/, '') || '/' : `/en${path}`);

/** getStaticPaths용: 언어마다 한 벌. extra = 원래 params·props 목록(없으면 언어만). */
export const withLang = (list = [{}], langs = LANGS) =>
  langs.flatMap((lang) =>
    list.map((e) => ({ ...e, params: { ...(e.params ?? {}), lang: lang === 'ko' ? undefined : lang } })),
  );

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, over) {
  if (Array.isArray(base) && Array.isArray(over)) return [...base.map((b, i) => (i < over.length ? merge(b, over[i]) : b)), ...over.slice(base.length)];
  if (isObj(base) && isObj(over)) {
    const out = { ...base };
    for (const [k, v] of Object.entries(over)) out[k] = k in base ? merge(base[k], v) : v;
    return out;
  }
  return over === undefined ? base : over;
}

/** 데이터의 그 언어 모습 (영어면 "en" 칸을 덮음). */
export const loc = (obj, lang) => {
  if (!obj) return obj;
  const { en, ...rest } = obj;
  return lang === 'en' && en ? merge(rest, en) : rest;
};

const T = {
  ko: {
    'nav.home': '홈', 'nav.games': '게임', 'nav.blog': '블로그', 'nav.about': '소개', 'nav.contact': '문의',
    'nav.main': '주 메뉴', 'nav.zone': '{0} 메뉴', 'lang.switch': 'EN', 'lang.switchLabel': 'English',
    'zone.home': '게임 홈', 'zone.story': '소설', 'zone.assets': '에셋', 'zone.blog': '블로그', 'zone.about': '소개',
    'status.개발 중': '개발 중', 'status.데모': '데모', 'status.출시': '출시',
    'home.gamesBtn': '게임 보기', 'home.games': '게임', 'home.gamesNote': '게임마다 홈 · 블로그 · 소개가 따로 있어요',
    'home.activity': '개발 활동', 'home.activityNote': '모든 게임 · GitHub 커밋 자동 연동', 'home.commitNote': '게임 저장소의 커밋 메시지만 자동으로 들어오고, 코드는 공개되지 않아요.',
    'home.recent': '최근 글', 'home.all': '전체 보기 →', 'home.noPosts': '아직 쓴 글이 없어요. 첫 글이 올라오면 여기에 보여요.',
    'home.maker': '만든 사람', 'home.aboutLink': '소개 페이지 →',
    'stat.games': '게임', 'stat.posts': '글', 'stat.commits': '커밋', 'stat.days': '작업한 날',
    'build.tag': 'v{0} · 빌드 {1}', 'build.full': 'v{0} · 빌드 {1} · {2}', 'build.label': '빌드', 'lastWork': '마지막 작업 {0}',
    'link.blog': '블로그 {0}', 'koreanOnly': '한국어',
    'games.title': '게임', 'games.desc': '만들고 있는 게임들. 게임마다 소개와 개발 일지가 따로 있어요.', 'games.lead': '만들고 있는 게임이에요. 게임마다 소개와 블로그가 따로 있어요.',
    'blog.title': '블로그', 'blog.desc': '게임 개발 이야기, Unity 팁, 회고', 'blog.lead': '모든 게임의 개발 일지를 날짜순으로 모았어요.', 'blog.byGame': '게임별로 보기', 'blog.empty': '아직 쓴 글이 없어요.',
    'gblog.title': '{0} 블로그', 'gblog.desc': '{0}를 만드는 과정을 적은 개발 일지', 'gblog.lead': '{0}를 만드는 과정을 하루 한 편씩 적어요.', 'gblog.koNote': '',
    'post.prev': '← 이전 글', 'post.next': '다음 글 →', 'post.other': '다른 글',
    'card.go': '게임 페이지 보기 →',
    'game.devlogBtn': '개발 기록', 'game.start': '{0} 시작', 'game.click': '클릭하면 브라우저에서 바로 실행돼요',
    'game.testOnly': '지금은 테스트 빌드만 있어요', 'game.testSub': 'PC와 모바일 브라우저에서 플레이할 수 있는 테스트 빌드가 있어요. 테스트에 참여하고 싶다면 연락 주세요.', 'game.testBtn': '테스트 참여 문의',
    'game.full': '전체 화면', 'game.loadNote': '처음 불러올 때 몇 초 걸릴 수 있어요.', 'game.frame': '게임 플레이 화면',
    'game.world': '세계관', 'game.hub': '게임 안의 게임들', 'game.cast': '등장 캐릭터', 'game.allAssets': '에셋 전체 보기 →',
    'game.controls': '조작법', 'game.info': '제작 정보', 'game.privacy': '개인정보처리방침',
    'game.devlog': '개발 기록', 'game.devlogNote': '게임 저장소의 커밋 메시지가 자동으로 들어와요. ★ 표시는 주요 단계예요.',
    'about.title': '{0} 소개', 'about.browse': '둘러보기', 'about.playText': '플레이 화면 · 등장 캐릭터 · 조작법', 'about.novel': '소설', 'about.chapters': '{0}편',
    'about.assets': '에셋', 'about.assetsText': '그림 모음 {0}장', 'about.posts': '개발 일지 {0}편', 'about.noPosts': '아직 쓴 글이 없어요',
    'about.commits': '커밋 {0}개', 'about.maker': '만든 사람', 'about.makerLink': '만든 사람 소개 →', 'about.contactLink': '테스트 참여 · 문의 →',
    'assets.title': '{0} 에셋', 'assets.desc': '{0}에서 쓰는 그림을 종류별로 모았어요.', 'assets.h': '에셋', 'assets.zoom': '{0} 크게 보기',
    'story.novel': '소설', 'story.gameNovel': '{0} 소설', 'story.desc': '{0} — {1} 연작 소설', 'story.approx': '약 {0}자', 'story.total': '{0}편 · 모두 {1}',
    'story.toc': '소설 목차', 'story.prev': '← 이전 편', 'story.next': '다음 편 →', 'story.end': '끝', 'story.toToc': '목차로', 'story.other': '다른 편',
    'story.koOnly': '', 'story.chapterDesc': '소설 『{0}』 {1} 「{2}」',
    'heat.aria': '최근 {0}주 동안 {1}일, 커밋 {2}개', 'heat.cell': '{0} · 커밋 {1}개', 'heat.commits': '커밋', 'heat.days': '일 작업', 'heat.last': '마지막 업데이트',
    'ago.today': '오늘', 'ago.yesterday': '어제', 'ago.days': '{0}일 전',
    'tl.dev': '개발 중', 'tl.devNote': '다음 빌드에 들어갈 내용', 'tl.in': '빌드에 포함', 'tl.inNote': '에 들어간 내용', 'tl.filter': '커밋 종류로 거르기',
    'tl.all': '전체', 'tl.empty': '아직 가져온 커밋 기록이 없어요.', 'tl.allLink': '개발 기록 전체 보기 →', 'tl.more': '더 보기', 'tl.moreLeft': '더 보기 · {0}개 남음',
    'type.feat': '새 기능', 'type.asset': '그림·에셋', 'type.art': '그림·에셋', 'type.fix': '버그 수정', 'type.docs': '문서·기획', 'type.refactor': '정리', 'type.perf': '성능', 'type.etc': '기타',
    '404.title': '페이지를 찾을 수 없어요',
  },
  en: {
    'nav.home': 'Home', 'nav.games': 'Games', 'nav.blog': 'Blog', 'nav.about': 'About', 'nav.contact': 'Contact',
    'nav.main': 'Main menu', 'nav.zone': '{0} menu', 'lang.switch': '한국어', 'lang.switchLabel': '한국어',
    'zone.home': 'Game Home', 'zone.story': 'Novel', 'zone.assets': 'Assets', 'zone.blog': 'Blog', 'zone.about': 'About',
    'status.개발 중': 'In Development', 'status.데모': 'Demo', 'status.출시': 'Released',
    'home.gamesBtn': 'See Games', 'home.games': 'Games', 'home.gamesNote': 'Each game has its own home · blog · about page',
    'home.activity': 'Dev Activity', 'home.activityNote': 'All games · synced from GitHub commits', 'home.commitNote': 'Only commit messages from the game repositories come in automatically. The code stays private. (Commit messages are in Korean.)',
    'home.recent': 'Recent Posts', 'home.all': 'See all →', 'home.noPosts': 'No posts yet. The first one will show up here.',
    'home.maker': 'Who Makes These', 'home.aboutLink': 'About page →',
    'stat.games': 'Games', 'stat.posts': 'Posts', 'stat.commits': 'Commits', 'stat.days': 'Days worked',
    'build.tag': 'v{0} · Build {1}', 'build.full': 'v{0} · Build {1} · {2}', 'build.label': 'Build', 'lastWork': 'Last worked {0}',
    'link.blog': 'Blog {0}', 'koreanOnly': 'Korean',
    'games.title': 'Games', 'games.desc': 'Games in the making. Each has its own about page and dev log.', 'games.lead': 'Games I am making. Each one has its own about page and blog.',
    'blog.title': 'Blog', 'blog.desc': 'Game development stories, Unity tips, retrospectives', 'blog.lead': 'Dev logs from every game, by date. Posts are written in Korean.', 'blog.byGame': 'By game', 'blog.empty': 'No posts yet.',
    'gblog.title': '{0} Blog', 'gblog.desc': 'A dev log of making {0}', 'gblog.lead': 'A daily log of making {0}.', 'gblog.koNote': 'Dev logs are written in Korean only.',
    'post.prev': '← Previous', 'post.next': 'Next →', 'post.other': 'Other posts',
    'card.go': 'See the game page →',
    'game.devlogBtn': 'Dev Log', 'game.start': 'Start {0}', 'game.click': 'Click to play right in your browser',
    'game.testOnly': 'Only test builds for now', 'game.testSub': 'There is a test build you can play in PC and mobile browsers. If you would like to join the test, get in touch.', 'game.testBtn': 'Ask to Join the Test',
    'game.full': 'Fullscreen', 'game.loadNote': 'The first load may take a few seconds.', 'game.frame': 'Game screen',
    'game.world': 'World', 'game.hub': 'Games inside the game', 'game.cast': 'Characters', 'game.allAssets': 'See all assets →',
    'game.controls': 'Controls', 'game.info': 'Details', 'game.privacy': 'Privacy Policy',
    'game.devlog': 'Dev Log', 'game.devlogNote': 'Commit messages from the game repository come in automatically (in Korean). ★ marks a milestone.',
    'about.title': 'About {0}', 'about.browse': 'Explore', 'about.playText': 'Play screen · characters · controls', 'about.novel': 'Novel', 'about.chapters': '{0} chapters',
    'about.assets': 'Assets', 'about.assetsText': '{0} art sheets', 'about.posts': '{0} dev logs (Korean)', 'about.noPosts': 'No posts yet',
    'about.commits': '{0} commits', 'about.maker': 'Who Makes It', 'about.makerLink': 'About the maker →', 'about.contactLink': 'Join the test · Contact →',
    'assets.title': '{0} Assets', 'assets.desc': 'All the art used in {0}, by type.', 'assets.h': 'Assets', 'assets.zoom': 'View {0} larger',
    'story.novel': 'Novel', 'story.gameNovel': '{0} Novel', 'story.desc': '{0} — a serial novel of {1}', 'story.approx': 'about {0} words', 'story.approxKo': 'about {0} Korean characters', 'story.total': '{0} chapters · {1} in all',
    'story.toc': 'Contents', 'story.prev': '← Previous', 'story.next': 'Next →', 'story.end': 'End', 'story.toToc': 'Back to contents', 'story.other': 'Other chapters',
    'story.koOnly': 'The English translation is on its way. For now the novel is in Korean — the chapters below open the Korean text.', 'story.chapterDesc': 'The novel {0}, {1}: {2}',
    'heat.aria': '{1} days and {2} commits in the last {0} weeks', 'heat.cell': '{0} · {1} commits', 'heat.commits': 'commits', 'heat.days': 'days worked', 'heat.last': 'Last update',
    'ago.today': 'today', 'ago.yesterday': 'yesterday', 'ago.days': '{0} days ago',
    'tl.dev': 'In progress', 'tl.devNote': 'Going into the next build', 'tl.in': 'In the build', 'tl.inNote': 'contents', 'tl.filter': 'Filter by commit type',
    'tl.all': 'All', 'tl.empty': 'No commit history fetched yet.', 'tl.allLink': 'See the full dev log →', 'tl.more': 'Show more', 'tl.moreLeft': 'Show more · {0} left',
    'type.feat': 'New feature', 'type.asset': 'Art·assets', 'type.art': 'Art·assets', 'type.fix': 'Bug fix', 'type.docs': 'Docs·design', 'type.refactor': 'Cleanup', 'type.perf': 'Performance', 'type.etc': 'Other',
    '404.title': 'Page not found',
  },
};

/** 화면 글자. {0} {1}… 자리에 args. 영어에 없으면 한국어. */
export const t = (lang, key, ...args) => {
  const s = T[lang]?.[key] ?? T.ko[key] ?? key;
  return args.length ? s.replace(/\{(\d+)\}/g, (m, i) => (args[i] ?? m)) : s;
};

/** 숫자 표시 (천 단위) */
export const num = (lang, n) => n.toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR');
