
'use strict';

// GitHub Pages 설정
const REPO = {
  owner: 'jeonyunchang',
  name: 'yunchang',
  branch: 'main',
  path: 'data/posts.json'
};

const NAMES = {
  all: '전체',
  education: '교육',
  research: '연구',
  work: '업무',
  'self-development': '자기계발'
};

const $ = id => document.getElementById(id);

const state = {
  posts: [],
  category: 'all',
  token: '',
  editing: null,
  opened: null,
  busy: false
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function elem(tag, cls, value) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (value !== undefined) el.textContent = String(value);
  return el;
}

function normalize(p, i) {
  if (!p || typeof p !== 'object') p = {};
  const body = String(p.content ?? p.body ?? p.text ?? '');
  const category = String(p.category ?? p.type ?? 'education');
  const tags = Array.isArray(p.tags)
    ? p.tags.map(String)
    : String(p.tags || '').split(',').map(s => s.trim()).filter(Boolean);

  return {
    ...p,
    id: String(p.id ?? `legacy-${i}`),
    title: String(p.title ?? p.name ?? '제목 없음'),
    category: category === 'growth' || category === 'self'
      ? 'self-development' : category,
    date: String(p.date ?? p.createdAt ?? '').slice(0, 10),
    summary: String(p.summary ?? p.excerpt ?? body.slice(0, 140)),
    content: body,
    tags
  };
}

function extract(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.posts)) return json.posts;
  throw Error('posts.json은 JSON 배열 또는 {"posts": [...]} 형식이어야 합니다.');
}

function notice(text) {
  $('loadMessage').textContent = text;
  $('loadMessage').hidden = !text;
}

function formNotice(text) {
  $('formInfo').textContent = text;
}

function formatDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '')
    ? value.replaceAll('-', '.')
    : (value || '날짜 미정');
}

// 게시글 불러오기
async function loadPosts() {
  try {
    const response = await fetch(
      `/yunchang/data/posts.json?v=${Date.now()}`,
      { cache: 'no-store' }
    );

    if (response.status === 404) {
      state.posts = [];
      notice('');
    } else if (!response.ok) {
      throw Error(`HTTP ${response.status}`);
    } else {
      state.posts = extract(await response.json()).map(normalize);
      notice('');
    }
  } catch (e) {
    state.posts = [];
    notice(`게시글 데이터 확인 필요: ${e.message}. data/posts.json 경로와 JSON 형식을 확인해 주세요.`);
  }

  render();
}

// 게시글 목록 렌더링
function render() {
  $('totalCount').textContent = state.posts.length;

  const q = $('search').value.trim().toLocaleLowerCase('ko-KR');

  let list = state.posts.filter(p =>
    (state.category === 'all' || p.category === state.category) &&
    (!q || [p.title, p.summary, p.content, ...(p.tags || [])]
      .join(' ').toLocaleLowerCase('ko-KR').includes(q))
  );

  const sort = $('sort').value;

  list.sort((a, b) =>
    sort === 'title'
      ? a.title.localeCompare(b.title, 'ko-KR')
      : (sort === 'oldest' ? 1 : -1) *
        String(a.date).localeCompare(String(b.date))
  );

  $('visibleCount').textContent = String(list.length).padStart(2, '0');

  document.querySelectorAll('[data-category]').forEach(b =>
    b.classList.toggle('active', b.dataset.category === state.category)
  );

  const grid = $('posts');
  grid.replaceChildren();
  $('empty').hidden = list.length > 0;

  for (const post of list) {
    const card = elem('button', 'post-card');
    card.type = 'button';

    const top = elem('div', 'card-top');

    top.append(
      elem('span', 'category-tag', NAMES[post.category] || post.category),
      elem('span', 'card-date', formatDate(post.date))
    );

    const bottom = elem('div', 'card-footer');

    bottom.append(
      elem('span', '', (post.tags || []).slice(0, 2).map(x => `#${x}`).join(' ')),
      elem('span', '', '기록 읽기 ↗')
    );

    card.append(
      top,
      elem('h3', '', post.title),
      elem('p', 'card-desc', post.summary || post.content.slice(0, 130)),
      bottom
    );

    card.addEventListener('click', () => openPost(post.id));
    grid.append(card);
  }
}

// 카테고리 전환
function setCategory(key) {
  if (!NAMES[key]) return;

  state.category = key;
  $('editor').hidden = true;
  render();
  $('archive').scrollIntoView({ behavior: 'smooth' });
}

// 글 열람
function openPost(id) {
  const p = state.posts.find(x => x.id === id);
  if (!p) return;

  state.opened = id;

  $('modalCategory').textContent = NAMES[p.category] || p.category;
  $('modalTitle').textContent = p.title;
  $('modalDate').textContent = formatDate(p.date);
  $('modalSummary').textContent = p.summary;
  $('modalContent').textContent = p.content;

  $('modalTags').replaceChildren(
    ...p.tags.map(t => elem('span', '', `#${t}`))
  );

  $('modalEdit').hidden = !state.token;
  $('postDialog').showModal();
}

// 글쓰기 화면
function showEditor() {
  $('editor').hidden = false;
  $('editor').scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  state.editing = null;
  $('postForm').reset();
  $('date').value = today();
  $('formTitle').textContent = '새 기록 작성';
  $('save').textContent = 'GitHub에 저장하기';
  $('delete').hidden = true;
  formNotice('');
  preview();
}

function values() {
  return {
    title: $('title').value.trim(),
    category: $('category').value,
    date: $('date').value,
    summary: $('summary').value.trim(),
    tags: $('tags').value.split(',').map(x => x.trim()).filter(Boolean),
    content: $('content').value.trim()
  };
}

// 실시간 미리보기
function preview() {
  const p = values();

  $('previewTitle').textContent = p.title || '새 기록의 제목';
  $('previewCategory').textContent = NAMES[p.category];
  $('previewDate').textContent = formatDate(p.date);
  $('previewSummary').textContent = p.summary || '한 줄 소개 미리보기';
  $('previewContent').textContent = p.content || '여기에 본문 미리보기가 표시됩니다.';
}

// 수정 화면
function editPost(id) {
  if (!state.token) return;

  const p = state.posts.find(x => x.id === id);
  if (!p) return;

  state.editing = id;

  $('title').value = p.title;
  $('category').value = NAMES[p.category] ? p.category : 'education';
  $('date').value = /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : today();
  $('summary').value = p.summary;
  $('tags').value = p.tags.join(', ');
  $('content').value = p.content;

  $('formTitle').textContent = '기록 수정';
  $('save').textContent = '수정 내용 저장';
  $('delete').hidden = false;

  $('postDialog').close();
  showEditor();
  preview();
}

// GitHub API 연결
const apiPath =
  `https://api.github.com/repos/${REPO.owner}/${REPO.name}/contents/${REPO.path}`;

function headers() {
  return {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Authorization': `Bearer ${state.token}`
  };
}

async function github(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
    cache: 'no-store'
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok && res.status !== 404) {
    throw Error(
      res.status === 401 ? '토큰이 유효하지 않습니다.' :
      res.status === 403 ? 'GitHub 권한이 부족합니다. Contents: Read and write 권한을 확인해 주세요.' :
      `GitHub 오류 ${res.status}: ${data.message || '요청 실패'}`
    );
  }

  return { res, data };
}

// 한글 JSON을 Base64로 변환
function fromBase64(s) {
  const b = atob(s.replace(/\s/g, ''));
  return new TextDecoder().decode(
    Uint8Array.from(b, c => c.charCodeAt(0))
  );
}

function toBase64(s) {
  const bytes = new TextEncoder().encode(s);
  let out = '';

  for (let i = 0; i < bytes.length; i += 8192) {
    out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }

  return btoa(out);
}

// GitHub의 최신 게시글 데이터 읽기
async function remotePosts() {
  const { res, data } = await github(
    `${apiPath}?ref=${encodeURIComponent(REPO.branch)}`
  );

  if (res.status === 404) {
    return { sha: null, original: [], items: [] };
  }

  if (!data.content || !data.sha) {
    throw Error('GitHub 게시글 파일을 읽을 수 없습니다.');
  }

  let original;

  try {
    original = JSON.parse(fromBase64(data.content));
  } catch {
    throw Error('기존 posts.json이 올바른 JSON이 아니므로 덮어쓰지 않았습니다.');
  }

  return {
    sha: data.sha,
    original,
    items: extract(original)
  };
}

// GitHub에 게시글 저장
async function commitPosts(remote, items, message) {
  const data = Array.isArray(remote.original)
    ? items
    : { ...remote.original, posts: items };

  const body = {
    message,
    branch: REPO.branch,
    content: toBase64(JSON.stringify(data, null, 2) + '\n')
  };

  if (remote.sha) body.sha = remote.sha;

  const { res, data: result } = await github(apiPath, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw Error(`GitHub 저장 오류: ${result.message || res.status}`);
  }

  state.posts = items.map(normalize);

  notice('GitHub에 저장되었습니다. 공개 사이트에 반영되기까지 약간의 시간이 걸릴 수 있습니다.');
  render();
}

// 관리자 연결
async function connect() {
  const token = $('token').value.trim();

  if (!token) {
    return formNotice('GitHub 토큰을 입력해 주세요.');
  }

  state.token = token;
  $('token').value = '';
  $('connect').disabled = true;

  formNotice('GitHub 계정을 확인하는 중입니다...');

  try {
    const { res, data } = await github('https://api.github.com/user');

    if (!res.ok ||
        String(data.login).toLowerCase() !== REPO.owner.toLowerCase()) {
      throw Error('jeonyunchang 계정의 토큰만 연결할 수 있습니다.');
    }

    await remotePosts();

    $('authInfo').textContent = `● @${data.login} 연결됨`;
    $('disconnect').hidden = false;
    formNotice('관리자 연결 완료. 글을 저장할 수 있습니다.');
  } catch (e) {
    state.token = '';
    $('authInfo').textContent = '연결되지 않음';
    formNotice(e.message);
  } finally {
    $('connect').disabled = false;
  }
}

// 새 글 작성 및 수정
async function savePost(e) {
  e.preventDefault();

  if (state.busy) return;

  const p = values();

  if (!p.title || !p.date || !p.content) {
    return formNotice('제목, 작성일, 본문은 필수입니다.');
  }

  if (!state.token) {
    return formNotice('먼저 본인 GitHub 토큰으로 연결해 주세요.');
  }

  state.busy = true;
  $('save').disabled = true;
  formNotice('GitHub에 저장 중입니다...');

  try {
    const remote = await remotePosts();
    const items = [...remote.items];

    if (state.editing) {
      const index = items.findIndex(
        (x, i) => normalize(x, i).id === state.editing
      );

      if (index < 0) {
        throw Error('수정할 글을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.');
      }

      items[index] = {
        ...items[index],
        ...p,
        id: String(items[index].id ?? state.editing)
      };
    } else {
      items.unshift({
        id: globalThis.crypto?.randomUUID?.() || `post-${Date.now()}`,
        ...p
      });
    }

    await commitPosts(
      remote,
      items,
      `${state.editing ? 'Update' : 'Add'} archive post: ${p.title}`
    );

    resetForm();
    formNotice('저장 성공! GitHub Pages 배포 후 방문자 화면에도 반영됩니다.');
  } catch (err) {
    formNotice(`저장 실패: ${err.message}`);
  } finally {
    state.busy = false;
    $('save').disabled = false;
  }
}

// 글 삭제
async function deletePost() {
  if (!state.token || !state.editing || state.busy) return;

  if (!confirm('이 게시글을 삭제할까요? GitHub에는 변경 기록이 남습니다.')) {
    return;
  }

  state.busy = true;

  try {
    const remote = await remotePosts();

    const index = remote.items.findIndex(
      (x, i) => normalize(x, i).id === state.editing
    );

    if (index < 0) throw Error('삭제할 글을 찾지 못했습니다.');

    const items = remote.items.filter((_, i) => i !== index);

    await commitPosts(remote, items, 'Delete archive post');

    resetForm();
    formNotice('글을 삭제했습니다.');
  } catch (err) {
    formNotice(`삭제 실패: ${err.message}`);
  } finally {
    state.busy = false;
  }
}

// 이벤트 연결 및 시작
function start() {
  $('year').textContent = new Date().getFullYear();
  $('date').value = today();

  document.querySelectorAll('[data-category]').forEach(b => {
    b.addEventListener('click', () => setCategory(b.dataset.category));
  });

  $('search').addEventListener('input', render);
  $('sort').addEventListener('change', render);

  $('writeOpen').addEventListener('click', showEditor);

  $('writeClose').addEventListener('click', () => {
    $('editor').hidden = true;
    $('archive').scrollIntoView({ behavior: 'smooth' });
  });

  $('postForm').addEventListener('input', preview);
  $('postForm').addEventListener('change', preview);
  $('postForm').addEventListener('submit', savePost);

  $('clearForm').addEventListener('click', resetForm);
  $('connect').addEventListener('click', connect);

  $('token').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      connect();
    }
  });

  $('disconnect').addEventListener('click', () => {
    state.token = '';
    $('authInfo').textContent = '연결되지 않음';
    $('disconnect').hidden = true;
    formNotice('연결이 해제되었습니다.');
  });

  $('delete').addEventListener('click', deletePost);

  $('modalClose').addEventListener('click', () => $('postDialog').close());
  $('modalDone').addEventListener('click', () => $('postDialog').close());

  $('modalEdit').addEventListener('click', () => {
    editPost(state.opened);
  });

  $('postDialog').addEventListener('click', e => {
    if (e.target === $('postDialog')) $('postDialog').close();
  });

  render();
  preview();
  loadPosts();
}

start();
