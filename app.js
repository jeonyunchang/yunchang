const POST_DATA_URL = './data/posts.json';
const CATEGORY_NAMES = Object.freeze({
  education: '교육', research: '연구', work: '업무', 'self-development': '자기계발'
});
const state = { posts: [], category: 'all', query: '' };
const $ = (selector) => document.querySelector(selector);
$('#year').textContent = String(new Date().getFullYear());

function el(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined && value !== null) node.textContent = String(value);
  return node;
}
function normalizePost(item) {
  if (!item || typeof item !== 'object' || !CATEGORY_NAMES[item.category]) return null;
  if (!item.id || !item.title) return null;
  return {
    id: String(item.id), title: String(item.title), category: item.category,
    date: /^\d{4}-\d{2}-\d{2}$/.test(item.date || '') ? item.date : '',
    summary: typeof item.summary === 'string' ? item.summary : '',
    content: typeof item.content === 'string' ? item.content : '',
    tags: Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string').slice(0, 12) : [],
    image: typeof item.image === 'string' ? item.image : '',
    links: Array.isArray(item.links) ? item.links.filter(link => link && typeof link.label === 'string' && typeof link.url === 'string') : []
  };
}
function safeUrl(value) {
  try {
    const parsed = new URL(value, document.baseURI);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') ? parsed.href : null;
  } catch (_) { return null; }
}
function filterPosts() {
  const query = state.query.trim().toLocaleLowerCase();
  return state.posts.filter(post => {
    if (state.category !== 'all' && post.category !== state.category) return false;
    if (!query) return true;
    return [post.title, post.summary, post.content, CATEGORY_NAMES[post.category], ...post.tags]
      .join(' ').toLocaleLowerCase().includes(query);
  });
}
function setCategory(category) {
  if (category !== 'all' && !CATEGORY_NAMES[category]) return;
  state.category = category;
  document.querySelectorAll('[data-filter]').forEach(button => {
    const on = button.dataset.filter === category;
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
  });
  document.querySelectorAll('[data-category]').forEach(link => {
    const on = link.dataset.category === category;
    link.classList.toggle('active', on);
    if (on) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  render();
}
function render() {
  const list = $('#post-list');
  list.replaceChildren();
  const visible = filterPosts();
  $('#result-count').textContent = `${visible.length}개의 기록`;
  if (!visible.length) {
    const empty = el('div', 'empty-state');
    empty.append(el('h3', '', state.posts.length === 0 ? '첫 기록을 기다리고 있어요' : '검색 결과가 없어요'));
    empty.append(el('p', '', state.posts.length === 0
      ? 'GitHub의 data/posts.json 파일에 글을 추가하면 이곳에 자동으로 나타납니다.'
      : '다른 검색어 또는 분야를 선택해 보세요.'));
    list.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  visible.forEach(post => {
    const button = el('button', 'post-card');
    button.type = 'button';
    button.setAttribute('aria-label', `${post.title} 글 읽기`);
    const top = el('div', 'card-top');
    top.append(el('span', 'category-label', CATEGORY_NAMES[post.category]));
    top.append(el('time', 'post-date', post.date));
    const bottom = el('div', 'card-bottom');
    const tags = el('div', 'tags');
    post.tags.slice(0, 3).forEach(tag => tags.append(el('span', 'tag', `#${tag}`)));
    bottom.append(tags, el('span', 'read-more', '읽어보기 ↗'));
    button.append(top, el('div', 'post-title', post.title), el('p', 'post-summary', post.summary || post.content.slice(0, 110)), bottom);
    button.addEventListener('click', () => {
      location.hash = `post/${encodeURIComponent(post.id)}`;
      if (location.hash === `#post/${encodeURIComponent(post.id)}`) syncDialog();
    });
    fragment.append(button);
  });
  list.append(fragment);
}
function renderArticle(post) {
  const body = $('#dialog-body');
  body.replaceChildren();
  const meta = el('div', 'dialog-meta');
  meta.append(el('span', 'category-label', CATEGORY_NAMES[post.category]));
  meta.append(el('time', '', post.date));
  body.append(meta, el('h2', 'dialog-title', post.title));
  body.querySelector('.dialog-title').id = 'dialog-title';
  if (post.summary) body.append(el('p', 'dialog-summary', post.summary));
  if (post.tags.length) {
    const tags = el('div', 'tags');
    tags.style.marginTop = '15px';
    post.tags.forEach(tag => tags.append(el('span', 'tag', `#${tag}`)));
    body.append(tags);
  }
  body.append(el('hr', 'dialog-divider'));
  if (post.image) {
    const imageHref = safeUrl(post.image);
    if (imageHref) {
      const image = el('img', 'post-image');
      image.src = imageHref;
      image.alt = `${post.title} 관련 이미지`;
      image.loading = 'lazy';
      body.append(image);
    }
  }
  const content = el('div', 'dialog-content');
  post.content.split(/\n\s*\n/).forEach(paragraph => {
    if (paragraph.trim()) content.append(el('p', '', paragraph));
  });
  if (!content.children.length) content.append(el('p', '', '본문 내용이 없습니다.'));
  body.append(content);
  if (post.links.length) {
    body.append(el('h3', 'links-heading', '관련 자료'));
    const links = el('div', 'post-links');
    post.links.forEach(link => {
      const href = safeUrl(link.url);
      if (!href) return;
      const a = el('a', '', `${link.label} ↗`);
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      links.append(a);
    });
    body.append(links);
  }
  const footer = el('div', 'dialog-footer');
  const share = el('button', 'copy-link', '글 링크 복사');
  share.type = 'button';
  share.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      share.textContent = '복사했어요 ✓';
    } catch (_) {
      share.textContent = '주소창의 URL을 복사해 주세요';
    }
  });
  footer.append(share);
  body.append(footer);
}
function syncDialog() {
  const dialog = $('#post-dialog');
  const hash = decodeURIComponent(location.hash.slice(1));
  if (!hash.startsWith('post/')) {
    if (dialog.open) dialog.close();
    return;
  }
  const id = hash.slice(5);
  const post = state.posts.find(item => item.id === id);
  if (!post) {
    if (dialog.open) dialog.close();
    return;
  }
  renderArticle(post);
  if (!dialog.open) dialog.showModal();
}
function closeArticle() {
  if (location.hash.startsWith('#post/')) location.hash = 'articles';
  if ($('#post-dialog').open) $('#post-dialog').close();
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => setCategory(button.dataset.filter)));
document.querySelectorAll('[data-category]').forEach(link => link.addEventListener('click', () => setCategory(link.dataset.category)));
$('#search').addEventListener('input', event => { state.query = event.target.value; render(); });
$('#dialog-close').addEventListener('click', closeArticle);
$('#post-dialog').addEventListener('click', event => { if (event.target === $('#post-dialog')) closeArticle(); });
$('#post-dialog').addEventListener('close', () => { if (location.hash.startsWith('#post/')) location.hash = 'articles'; });
addEventListener('hashchange', syncDialog);

async function loadPosts() {
  try {
    const response = await fetch(POST_DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('JSON 최상위 형식은 배열([ ])이어야 합니다.');
    const normalized = data.map(normalizePost).filter(Boolean);
    const knownIds = new Set();
    state.posts = normalized.filter(post => {
      if (knownIds.has(post.id)) return false;
      knownIds.add(post.id);
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'ko'));
    $('#total-count').textContent = String(state.posts.length);
    render();
    syncDialog();
  } catch (error) {
    $('#error-message').hidden = false;
    $('#error-message').textContent = '글 목록을 불러오지 못했습니다. data/posts.json 파일이 같은 배포 폴더에 있는지, JSON 형식이 올바른지 확인해 주세요.';
    $('#result-count').textContent = '불러오기 실패';
    console.error('게시글 파일 읽기 실패:', error);
  }
}
loadPosts();
