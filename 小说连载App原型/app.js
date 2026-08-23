const toast = document.querySelector('.toast');
const APP_VERSION = '1.4';
const APP_MODIFIED_AT = '2026年08月23日 17:07';
document.querySelector('.about-card p').textContent = `私人小说工作台 · v${APP_VERSION}`;
document.querySelector('.about-card p + p').textContent = `修改时间：${APP_MODIFIED_AT}`;
const screen = document.querySelector('.screen');
const settingsPage = document.querySelector('.settings-page');
const chaptersPage = document.querySelector('.chapters-page');
const editorPage = document.querySelector('.editor-page');
const detailPage = document.querySelector('.detail-page');
const addWorkPage = document.querySelector('.add-work-page');
const materialsPage = document.querySelector('.materials-page');
const addMaterialPage = document.querySelector('.add-material-page');
const trashPage = document.querySelector('.trash-page');
const syncPage = document.querySelector('.sync-page');
const publishPage = document.querySelector('.publish-page');
const characterFormPage = document.querySelector('.add-character-page');
const toolPages = document.querySelectorAll('.tool-page');
const bookMenu = document.querySelector('#bookMenu');
const toolBookMenu = document.querySelector('#toolBookMenu');
const chapterList = document.querySelector('.chapter-list');
const books = JSON.parse(localStorage.getItem('mojian-books') || '{}');
let trash = JSON.parse(localStorage.getItem('mojian-trash') || '[]');
let activeBook = localStorage.getItem('mojian-active-book');
let activeChapterIndex = null;
let activeMaterialFilter = '全部';
let pendingDeletion = null;
let characterEditMode = false;
let editingCharacterIndex = null;
let editingEventIndex = null;
let editingOutlineIndex = null;
let editingMaterialIndex = null;
let publishingChapterIndex = null;
let applyingCloudState = false;
let cloudSaveTimer = null;
let updateReloadQueued = false;

document.body.insertAdjacentHTML('beforeend', '<div id="deleteModal" class="delete-modal" hidden><div class="delete-dialog"><h2 id="deleteTitle">确认删除？</h2><p id="deleteHint"></p><p class="delete-code">请输入 <b id="deleteCode">0000</b> 确认</p><input id="deleteCodeInput" inputmode="numeric" maxlength="4" placeholder="输入四位数字"><div class="delete-actions"><button id="deleteCancel">取消</button><button id="deleteConfirm" disabled>确认删除</button></div></div></div>');

Object.values(books).forEach(book => {
  book.chapters ||= []; book.characters ||= []; book.events ||= []; book.outlines ||= []; book.materials ||= [];
});

function notify(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function saveBooks() { localStorage.setItem('mojian-books', JSON.stringify(books)); queueCloudSave(); }
function saveTrash() { localStorage.setItem('mojian-trash', JSON.stringify(trash)); queueCloudSave(); }
function bookCount(book) { const chapters = book.chapters || []; const words = chapters.reduce((sum, item) => sum + (item.words || 0), 0); return `共 ${chapters.length} 章 · ${words.toLocaleString()} 字`; }
function setActiveBook(name) { if (!name || !books[name]) return false; activeBook = name; localStorage.setItem('mojian-active-book', name); return true; }
function scoped(key) { return activeBook && books[activeBook] ? books[activeBook][key] : []; }
function contextName() { return activeBook ? `《${activeBook}》` : '请先选择作品'; }
function ensureActiveBook() { const names = Object.keys(books); if (!books[activeBook] && names.length) setActiveBook(names[0]); return Boolean(activeBook && books[activeBook]); }
function cloudState() { return { books, trash, activeBook }; }
function setSyncStatus(message) { const status = document.querySelector('#syncStatus'); if (status) status.textContent = message; }
function queueCloudSave() {
  if (applyingCloudState || !document.querySelector('#syncToggle')?.checked) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(async () => {
    try {
      const cloud = window.mojianCloud; if (!cloud || !(await cloud.getUser())) return;
      await cloud.saveState(cloudState()); const syncedAt = new Date(); localStorage.setItem('mojian-last-sync', syncedAt.toISOString()); setSyncStatus(`上次同步：${syncedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (error) { setSyncStatus('同步失败，请检查网络或数据库设置'); }
  }, 700);
}
function applyCloudState(state) {
  if (!state?.books) return false;
  applyingCloudState = true;
  Object.keys(books).forEach(key => delete books[key]); Object.assign(books, state.books);
  Object.values(books).forEach(book => { book.chapters ||= []; book.characters ||= []; book.events ||= []; book.outlines ||= []; book.materials ||= []; });
  trash = Array.isArray(state.trash) ? state.trash : [];
  activeBook = state.activeBook && books[state.activeBook] ? state.activeBook : Object.keys(books)[0] || null;
  if (activeBook) localStorage.setItem('mojian-active-book', activeBook); else localStorage.removeItem('mojian-active-book');
  localStorage.setItem('mojian-books', JSON.stringify(books)); localStorage.setItem('mojian-trash', JSON.stringify(trash));
  applyingCloudState = false; renderBookControls(); renderWorkList(); refreshScopedViews(); renderTrash(); return true;
}
function renderSyncAccount(user) {
  document.querySelector('#syncAccountStatus').textContent = user ? user.email : '未登录';
  document.querySelector('#syncPageStatus').textContent = user ? `已登录：${user.email}` : '使用邮箱登录，以便在设备间同步你的小说资料。';
  document.querySelector('#syncForm').hidden = Boolean(user); document.querySelector('#syncSignOut').hidden = !user;
  const syncOn = document.querySelector('#syncToggle')?.checked;
  const lastSync = localStorage.getItem('mojian-last-sync'); const lastSyncText = lastSync ? ` · 上次 ${new Date(lastSync).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '';
  setSyncStatus(user && syncOn ? `已开启 · 自动备份${lastSyncText}` : user ? '已登录 · 自动同步已关闭' : '需登录同步账户');
}
async function initialiseCloud() {
  try {
    const cloud = window.mojianCloud; if (!cloud) return;
    const user = await cloud.getUser(); renderSyncAccount(user);
    if (!user) return;
    const state = await cloud.loadState();
    if (state?.books) applyCloudState(state); else queueCloudSave();
  } catch (error) { setSyncStatus('云端未初始化，请运行建表脚本'); }
}
function openSyncPage() { showPage('作品'); screen.classList.add('show-sync'); syncPage.classList.add('is-visible'); }
function openPublishPage() { if (!ensureActiveBook()) { notify('请先创建一部作品'); return; } showPage('作品'); screen.classList.add('show-publish'); publishPage.classList.add('is-visible'); renderPublishQueue(); }

function showPage(page) {
  const chapters = page === '章节'; const settings = page === '设置'; const materials = page === '素材';
  screen.classList.toggle('show-chapters', chapters); screen.classList.toggle('show-settings', settings); screen.classList.toggle('show-materials', materials); screen.classList.remove('show-tool', 'show-editor', 'show-detail', 'show-add-work', 'show-add-material', 'show-trash', 'show-sync', 'show-add-character', 'show-publish');
  chaptersPage.classList.toggle('is-visible', chapters); settingsPage.classList.toggle('is-visible', settings); materialsPage.classList.toggle('is-visible', materials); trashPage.classList.remove('is-visible'); syncPage.classList.remove('is-visible'); publishPage.classList.remove('is-visible'); characterFormPage.classList.remove('is-visible'); editorPage.classList.remove('is-visible'); detailPage.classList.remove('is-visible'); addWorkPage.classList.remove('is-visible'); addMaterialPage.classList.remove('is-visible'); toolPages.forEach(item => item.classList.remove('is-visible'));
  if (!chapters) bookMenu.hidden = true;
  toolBookMenu.hidden = true;
  screen.scrollTop = 0;
}
function openTool(id) { if (!ensureActiveBook()) { notify('请先创建并选择一部作品'); return; } refreshScopedViews(); showPage('作品'); screen.classList.add('show-tool'); document.querySelector(id).classList.add('is-visible'); }
function openNewWork() { showPage('作品'); screen.classList.add('show-add-work'); addWorkPage.classList.add('is-visible'); document.querySelector('#workTitle').focus(); }
function openMaterialForm(index = null) { if (!ensureActiveBook()) { notify('请先创建并选择一部作品'); return; } const material = index === null ? null : scoped('materials')[index]; editingMaterialIndex = material ? index : null; document.querySelector('#materialFormTitle').textContent = material ? '编辑素材' : '新增素材'; document.querySelector('#materialForm button[type="submit"]').textContent = material ? '保存修改' : '保存素材'; document.querySelector('#materialType').value = material?.type || '灵感'; document.querySelector('#materialTitle').value = material?.title || ''; document.querySelector('#materialContent').value = material?.content || ''; document.querySelector('#materialTags').value = material?.tags || ''; refreshScopedViews(); showPage('作品'); screen.classList.add('show-add-material'); addMaterialPage.classList.add('is-visible'); setTimeout(() => document.querySelector('#materialTitle').focus(), 0); }

function renderBookControls() {
  const names = Object.keys(books); const ready = ensureActiveBook();
  document.querySelector('#bookSwitch').disabled = !ready; document.querySelector('#newChapterButton').disabled = !ready; document.querySelector('#newMaterialButton').disabled = !ready; document.querySelectorAll('#materialFilters button').forEach(button => { button.disabled = !ready; });
  document.querySelectorAll('[data-tool-book-switch]').forEach(button => { button.disabled = !ready; });
  bookMenu.innerHTML = names.map(name => `<button data-book="${escapeHtml(name)}">${escapeHtml(name)} <small>${bookCount(books[name])}</small></button>`).join('');
  document.querySelectorAll('#bookMenu button').forEach(button => button.addEventListener('click', () => { setActiveBook(button.dataset.book); renderChapters(); refreshScopedViews(); bookMenu.hidden = true; }));
  const materialSelect = document.querySelector('#materialBookSelect');
  materialSelect.innerHTML = ready ? names.map(name => `<option ${name === activeBook ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('') : '<option>请先创建作品</option>';
  materialSelect.disabled = !ready;
  if (!ready) renderChapters(); else renderChapters();
}
function openToolBookMenu() {
  const names = Object.keys(books);
  toolBookMenu.innerHTML = names.map(name => `<button data-book="${escapeHtml(name)}" class="${name === activeBook ? 'active' : ''}">${escapeHtml(name)}${name === activeBook ? '<span>当前</span>' : ''}</button>`).join('');
  toolBookMenu.hidden = !toolBookMenu.hidden;
  document.querySelectorAll('#toolBookMenu button').forEach(button => button.addEventListener('click', () => { setActiveBook(button.dataset.book); renderBookControls(); refreshScopedViews(); toolBookMenu.hidden = true; }));
}
function renderChapters() {
  const book = activeBook ? books[activeBook] : null;
  document.querySelector('#currentBook').textContent = book ? activeBook : '还没有作品'; document.querySelector('#chapterCount').textContent = book ? bookCount(book) : '先在作品页创建一部小说';
  if (!book || !book.chapters.length) { chapterList.innerHTML = `<div class="chapter-empty"><b>○</b>${book ? '还没有章节，准备好后开始写第一章。' : '创建作品后，章节会显示在这里。'}</div>`; return; }
  const keyword = document.querySelector('#chapterSearch').value.trim().toLowerCase();
  const visible = book.chapters.map((item, index) => ({ item, index })).filter(({ item }) => !keyword || `${item.title} ${item.body}`.toLowerCase().includes(keyword));
  const groups = visible.reduce((result, entry) => { const volume = entry.item.volume || '未分卷'; (result[volume] ||= []).push(entry); return result; }, {});
  chapterList.innerHTML = Object.entries(groups).map(([volume, items]) => `<section class="chapter-volume"><div class="chapter-volume-head"><h2>${escapeHtml(volume)}</h2><button class="volume-export" data-volume="${escapeHtml(volume)}">导出本卷</button></div>${items.map(({ item, index }) => `<button class="chapter-row" data-chapter-index="${index}"><span class="chapter-no">第 ${index + 1} 章</span><span class="chapter-title">${escapeHtml(item.title)}</span><span class="chapter-meta"><i class="chapter-status ${item.status || '草稿'}">${item.status || '草稿'}</i> ${(item.words || 0).toLocaleString()} 字</span><b>›</b></button>`).join('')}</section>`).join('') || '<div class="chapter-empty">没有匹配的章节</div>';
  document.querySelectorAll('.chapter-row').forEach(row => row.addEventListener('click', () => openEditor(Number(row.dataset.chapterIndex))));
  document.querySelectorAll('.volume-export').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); const chapters = book.chapters.filter(item => (item.volume || '未分卷') === button.dataset.volume); downloadText(exportChapters(activeBook, chapters), `墨间-${activeBook}-${button.dataset.volume}.txt`); notify('本卷已导出'); }));
}
function formatDate(value) { const date = value ? new Date(value) : new Date(); return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`; }
function renderDashboard() { const today = new Date().toDateString(); const chapters = Object.values(books).flatMap(book => book.chapters || []); document.querySelector('#dashboardWords').textContent = chapters.reduce((sum, item) => sum + (item.words || 0), 0).toLocaleString(); document.querySelector('#dashboardPending').textContent = chapters.filter(item => item.status === '待发布').length; document.querySelector('#dashboardToday').textContent = chapters.filter(item => item.updatedAt && new Date(item.updatedAt).toDateString() === today).reduce((sum, item) => sum + (item.words || 0), 0).toLocaleString(); }
function renderPublishQueue() { const select = document.querySelector('#publishBookSelect'); const names = Object.keys(books); select.innerHTML = names.map(name => `<option ${name === activeBook ? 'selected' : ''}>${escapeHtml(name)}</option>`).join(''); const chapters = scoped('chapters'); const list = chapters.map((chapter, index) => ({ chapter, index })).filter(({ chapter }) => chapter.status === '待发布' || chapter.status === '已发布'); document.querySelector('#publishQueue').innerHTML = list.length ? list.map(({ chapter, index }) => { const latest = chapter.publishRecords?.at(-1); return `<article class="publish-item"><div><span class="chapter-status ${chapter.status}">${chapter.status}</span><h3>第 ${index + 1} 章 · ${escapeHtml(chapter.title)}</h3><p>${latest ? `${escapeHtml(latest.platform || '未填写平台')} · ${formatDate(latest.publishedAt)}` : chapter.status === '待发布' ? '准备发布，尚未填写记录' : '暂无发布记录'}</p>${latest?.url ? `<a href="${escapeHtml(latest.url)}" target="_blank" rel="noopener">查看发布链接</a>` : ''}</div><button class="publish-record" data-chapter-index="${index}">${chapter.status === '已发布' ? '补充记录' : '记录发布'}</button></article>`; }).join('') : '<div class="publish-empty"><b>↑</b>还没有待发布或已发布章节。<br>在编辑器将章节状态设为“待发布”后，它会出现在这里。</div>'; document.querySelectorAll('.publish-record').forEach(button => button.addEventListener('click', () => openPublishForm(Number(button.dataset.chapterIndex)))); }
function openPublishForm(index) { const chapter = scoped('chapters')[index]; if (!chapter) return; publishingChapterIndex = index; const latest = chapter.publishRecords?.at(-1); document.querySelector('#publishFormTitle').textContent = `记录：${chapter.title}`; document.querySelector('#publishPlatform').value = latest?.platform || ''; document.querySelector('#publishedAt').value = latest?.publishedAt ? new Date(latest.publishedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16); document.querySelector('#publishUrl').value = latest?.url || ''; document.querySelector('#publishForm').hidden = false; document.querySelector('#publishPlatform').focus(); document.querySelector('#publishForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
function renderWorkList() {
  const names = Object.keys(books); document.querySelector('#workTotal').textContent = `${names.length} 部`;
  document.querySelector('#workList').innerHTML = names.map(name => { const book = books[name]; return `<button class="work-item" data-work="${escapeHtml(name)}"><span class="work-item-cover">${escapeHtml(name.slice(0, 1))}</span><span><h3>${escapeHtml(name)}</h3><p>${escapeHtml(book.genre || '未填写题材')} · ${bookCount(book)}</p></span><b>›</b></button>`; }).join('');
  document.querySelectorAll('.work-item').forEach(button => button.addEventListener('click', () => showWorkDetails(button.dataset.work)));
  renderDashboard();
}
function showWorkDetails(name) {
  if (!setActiveBook(name)) return; refreshScopedViews(); const book = books[name];
  screen.classList.remove('show-chapters', 'show-settings', 'show-materials', 'show-tool', 'show-editor', 'show-add-work', 'show-add-material', 'show-trash'); chaptersPage.classList.remove('is-visible'); settingsPage.classList.remove('is-visible'); materialsPage.classList.remove('is-visible'); trashPage.classList.remove('is-visible'); editorPage.classList.remove('is-visible'); addWorkPage.classList.remove('is-visible'); addMaterialPage.classList.remove('is-visible'); toolPages.forEach(item => item.classList.remove('is-visible'));
  screen.classList.add('show-detail'); detailPage.classList.add('is-visible');
  document.querySelector('#detailTitle').textContent = name; document.querySelector('#detailGenre').textContent = book.genre || '未填写题材'; document.querySelector('#detailGenreInfo').textContent = book.genre || '未填写'; document.querySelector('#detailChapters').textContent = book.chapters.length; document.querySelector('#detailWords').textContent = book.chapters.reduce((sum, item) => sum + (item.words || 0), 0).toLocaleString();
  document.querySelector('#detailCreatedAt').textContent = `创建于 ${formatDate(book.createdAt)}`; document.querySelector('#detailUpdated').textContent = book.updatedAt ? formatDate(book.updatedAt) : '暂无修改';
}
function renderCharacters() {
  const items = scoped('characters');
  document.querySelector('#characterEditButton').textContent = characterEditMode ? '完成' : '编辑';
  document.querySelector('#characterWorkContext').textContent = contextName();
  document.querySelector('#characterFormContext').textContent = contextName();
  document.querySelector('#characterCount').textContent = activeBook ? (items.length ? `${items.length} 个角色` : '还没有角色') : '选择作品后查看';
  const graph = document.querySelector('#characterGraph');
  if (!activeBook || !items.length) { graph.innerHTML = `<div class="graph-empty"><b>◎</b>${activeBook ? '还没有角色，点击右上角新增第一个角色。' : '请先选择一部作品。'}</div>`; return; }
  const names = new Set(items.map(item => item.name));
  const roots = items.filter(item => !item.relatedTo || !names.has(item.relatedTo));
  const renderNode = (item, visited = new Set()) => {
    if (visited.has(item.name)) return '';
    const next = new Set(visited); next.add(item.name);
    const children = items.filter(child => child.relatedTo === item.name);
    return `<li><div class="graph-node">${characterEditMode ? `<div class="graph-actions"><button class="graph-edit" data-character-index="${items.indexOf(item)}">编辑</button><button class="graph-delete" data-character-index="${items.indexOf(item)}">删除</button></div>` : ''}<h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.role)}</p>${item.relation ? `<span class="graph-relation">${escapeHtml(item.relation)}</span>` : ''}</div>${children.length ? `<ul>${children.map(child => renderNode(child, next)).join('')}</ul>` : ''}</li>`;
  };
  graph.innerHTML = `<ul class="graph-tree">${roots.map(item => renderNode(item)).join('')}</ul>`;
  document.querySelectorAll('.graph-edit').forEach(button => button.addEventListener('click', () => openCharacterForm(Number(button.dataset.characterIndex))));
  document.querySelectorAll('.graph-delete').forEach(button => button.addEventListener('click', () => requestDeletion('character', Number(button.dataset.characterIndex))));
}
function openCharacterForm(index = null) {
  if (!ensureActiveBook()) { notify('请先创建并选择一部作品'); return; }
  const character = index === null ? null : scoped('characters')[index];
  editingCharacterIndex = character ? index : null;
  const select = document.querySelector('#characterRelated');
  select.innerHTML = '<option value="">暂无关联 / 核心角色</option>' + scoped('characters').filter(item => item !== character).map(item => `<option>${escapeHtml(item.name)}</option>`).join('');
  document.querySelector('#characterFormContext').textContent = contextName();
  document.querySelector('.add-character-page .tool-header h1').textContent = character ? '编辑角色' : '新增角色';
  document.querySelector('#characterName').value = character?.name || '';
  document.querySelector('#characterRole').value = character?.role || '';
  select.value = character?.relatedTo || '';
  document.querySelector('#characterRelation').value = character?.relation || '';
  document.querySelector('#characterNote').value = character?.note || '';
  document.querySelector('#characterForm button[type="submit"]').textContent = character ? '保存修改' : '保存角色';
  showPage('作品'); screen.classList.add('show-add-character'); characterFormPage.classList.add('is-visible');
}
function renderTimeline() { const items = scoped('events'); document.querySelector('#timelineWorkContext').textContent = contextName(); document.querySelector('#timelineForm').hidden = true; editingEventIndex = null; document.querySelector('#timelineList').innerHTML = activeBook && items.length ? `<div class="timeline-rail">${items.map((item, index) => `<div class="timeline-swipe" data-event-index="${index}"><div class="timeline-actions"><button class="timeline-edit" data-event-index="${index}">编辑</button><button class="timeline-delete" data-event-index="${index}">删除</button></div><article class="timeline-item"><span class="timeline-dot" aria-hidden="true"></span><div class="timeline-content"><time>${escapeHtml(item.time)}</time><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.note || '暂无补充说明')}</p></div></article></div>`).join('')}</div>` : `<div class="timeline-empty"><b>⌇</b>${activeBook ? '还没有事件，从第一件关键事开始记录。' : '请先选择一部作品。'}</div>`; document.querySelectorAll('.timeline-edit').forEach(button => button.addEventListener('click', () => openTimelineForm(Number(button.dataset.eventIndex)))); document.querySelectorAll('.timeline-delete').forEach(button => button.addEventListener('click', () => requestDeletion('event', Number(button.dataset.eventIndex)))); document.querySelectorAll('.timeline-swipe').forEach(item => { let startX = 0; item.addEventListener('touchstart', event => { startX = event.changedTouches[0].clientX; }, { passive: true }); item.addEventListener('touchend', event => { const distance = event.changedTouches[0].clientX - startX; if (distance < -42) item.classList.add('is-open'); if (distance > 42) item.classList.remove('is-open'); }, { passive: true }); }); document.querySelector('#eventCount').textContent = activeBook ? (items.length ? `${items.length} 条事件` : '还没有事件') : '选择作品后查看'; }
function openTimelineForm(index = null) { const form = document.querySelector('#timelineForm'); const event = index === null ? null : scoped('events')[index]; editingEventIndex = event ? index : null; form.querySelector('h2').textContent = event ? '编辑事件' : '新增事件'; form.querySelector('button[type="submit"]').textContent = event ? '保存修改' : '保存事件'; document.querySelector('#eventTime').value = event?.time || ''; document.querySelector('#eventTitle').value = event?.title || ''; document.querySelector('#eventNote').value = event?.note || ''; form.hidden = false; document.querySelector('#eventTime').focus(); form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
function renderOutlines() { const items = scoped('outlines'); document.querySelector('#outlineWorkContext').textContent = contextName(); document.querySelector('#outlineList').innerHTML = activeBook && items.length ? items.map((item, index) => `<article class="outline-item"><div class="outline-item-head"><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.note || '暂无补充说明')}</p><small>${escapeHtml(item.chapter || '未关联章节')}</small><div class="item-actions"><button class="outline-edit" data-outline-index="${index}">编辑</button><button class="outline-delete" data-outline-index="${index}">删除</button></div></article>`).join('') : `<div class="material-empty"><b>◇</b>${activeBook ? '还没有情节，点击右上角新增一条吧。' : '请先选择一部作品。'}</div>`; document.querySelectorAll('.outline-edit').forEach(button => button.addEventListener('click', () => openOutlineForm(Number(button.dataset.outlineIndex)))); document.querySelectorAll('.outline-delete').forEach(button => button.addEventListener('click', () => requestDeletion('outline', Number(button.dataset.outlineIndex)))); document.querySelector('#outlineCount').textContent = activeBook ? (items.length ? `${items.length} 条情节` : '还没有情节') : '选择作品后查看'; }
function openOutlineForm(index = null) { if (!ensureActiveBook()) { notify('请先创建并选择一部作品'); return; } const item = index === null ? null : scoped('outlines')[index]; const form = document.querySelector('#outlineForm'); editingOutlineIndex = item ? index : null; form.querySelector('h2').textContent = item ? '编辑情节' : '新增情节'; form.querySelector('button[type="submit"]').textContent = item ? '保存修改' : '保存情节'; document.querySelector('#outlineTitle').value = item?.title || ''; document.querySelector('#outlineChapter').value = item?.chapter || ''; document.querySelector('#outlineNote').value = item?.note || ''; document.querySelector('#outlineStatus').value = item?.status || '待写'; form.hidden = false; document.querySelector('#outlineTitle').focus(); form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
function renderMaterials() { const items = scoped('materials'); const list = (activeMaterialFilter === '全部' ? items : items.filter(item => item.type === activeMaterialFilter)).map(item => ({ item, index: items.indexOf(item) })); document.querySelector('#materialList').innerHTML = activeBook && list.length ? list.map(({ item, index }) => `<article class="material-item"><span class="material-item-head"><span class="material-type">${escapeHtml(item.type)}</span><span class="material-work">${escapeHtml(activeBook)}</span></span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)}</p>${item.tags ? `<span class="material-tags"># ${escapeHtml(item.tags)}</span>` : ''}<div class="item-actions"><button class="material-edit" data-material-index="${index}">编辑</button><button class="material-delete" data-material-index="${index}">删除</button></div></article>`).join('') : `<div class="material-empty"><b>◇</b>${activeBook ? `还没有${activeMaterialFilter === '全部' ? '素材' : activeMaterialFilter + '素材'}，点击右上角新增一条吧。` : '请选择或创建一部作品。'}</div>`; document.querySelectorAll('.material-edit').forEach(button => button.addEventListener('click', () => openMaterialForm(Number(button.dataset.materialIndex)))); document.querySelectorAll('.material-delete').forEach(button => button.addEventListener('click', () => requestDeletion('material', Number(button.dataset.materialIndex)))); }
function refreshScopedViews() { renderCharacters(); renderTimeline(); renderOutlines(); renderMaterials(); document.querySelector('#materialWorkContext').textContent = contextName(); }

function openEditor(index) { if (!ensureActiveBook()) return; activeChapterIndex = index; const chapter = books[activeBook].chapters[index]; screen.classList.remove('show-chapters', 'show-settings', 'show-materials', 'show-tool'); chaptersPage.classList.remove('is-visible'); settingsPage.classList.remove('is-visible'); materialsPage.classList.remove('is-visible'); toolPages.forEach(item => item.classList.remove('is-visible')); screen.classList.add('show-editor'); editorPage.classList.add('is-visible'); document.querySelector('#chapterTitleInput').value = chapter.title || ''; document.querySelector('#chapterVolume').value = chapter.volume || ''; document.querySelector('#chapterStatus').value = chapter.status || '草稿'; document.querySelector('#chapterBodyInput').value = chapter.body || ''; updateEditorMeta(); }
function updateEditorMeta() { if (activeChapterIndex === null || !books[activeBook]) return; const chapter = books[activeBook].chapters[activeChapterIndex]; chapter.title = document.querySelector('#chapterTitleInput').value.trim() || '未命名章节'; chapter.volume = document.querySelector('#chapterVolume').value.trim(); chapter.body = document.querySelector('#chapterBodyInput').value; chapter.words = chapter.body.replace(/\s/g, '').length; chapter.status = document.querySelector('#chapterStatus').value; chapter.updatedAt = new Date().toISOString(); books[activeBook].updatedAt = chapter.updatedAt; saveBooks(); document.querySelector('#wordCount').textContent = `${chapter.words.toLocaleString()} 字`; document.querySelector('#editorState').textContent = '已自动保存'; renderDashboard(); }
function closeEditor() { updateEditorMeta(); renderBookControls(); renderChapters(); showPage('章节'); chaptersPage.classList.add('is-visible'); screen.classList.add('show-chapters'); if (updateReloadQueued) window.location.reload(); }
function moveToTrash(type, workName, data, index = null) { trash.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, type, workName, data, index, deletedAt: new Date().toISOString() }); saveTrash(); renderTrash(); }
function trashLabel(record) { return record.type === 'work' ? '作品' : record.type === 'chapter' ? '章节' : record.type === 'character' ? '人物' : record.type === 'event' ? '事件' : record.type === 'outline' ? '大纲' : '素材'; }
function renderTrash() {
  document.querySelector('#trashCount').textContent = trash.length ? `${trash.length} 项可恢复内容` : '暂无已删除内容';
  const groups = trash.reduce((result, item) => { (result[item.workName] ||= []).push(item); return result; }, {});
  document.querySelector('#trashList').innerHTML = trash.length ? Object.entries(groups).map(([name, items]) => `<section class="trash-group"><h2>《${escapeHtml(name)}》</h2>${items.map(item => `<article class="trash-item"><div><h3>${trashLabel(item)} · ${escapeHtml(item.type === 'work' ? name : item.data.title || item.data.name || '未命名')}</h3><p>删除于 ${formatDate(item.deletedAt)}</p></div><button class="restore-button" data-trash-id="${item.id}">还原</button></article>`).join('')}</section>`).join('') : '<div class="trash-empty"><b>♲</b>回收站为空</div>';
  document.querySelectorAll('.restore-button').forEach(button => button.addEventListener('click', () => restoreTrash(button.dataset.trashId)));
}
function openTrash() { showPage('作品'); screen.classList.add('show-trash'); trashPage.classList.add('is-visible'); renderTrash(); }
function restoreTrash(id) {
  const index = trash.findIndex(item => item.id === id); const item = trash[index]; if (!item) return;
  if (item.type === 'work') { if (books[item.workName]) { notify('同名作品已存在，无法还原'); return; } books[item.workName] = item.data; setActiveBook(item.workName); }
  else { if (!books[item.workName]) { notify('请先还原所属作品'); return; } const list = item.type === 'chapter' ? books[item.workName].chapters : item.type === 'character' ? books[item.workName].characters : item.type === 'event' ? books[item.workName].events : item.type === 'outline' ? books[item.workName].outlines : books[item.workName].materials; list.splice(Math.min(item.index ?? list.length, list.length), 0, item.data); }
  trash.splice(index, 1); saveTrash(); saveBooks(); renderBookControls(); renderWorkList(); refreshScopedViews(); renderTrash(); notify('已还原');
}
function requestDeletion(type, itemIndex = null) {
  if (!activeBook || (type === 'chapter' && activeChapterIndex === null) || ((type === 'material' || type === 'character' || type === 'event' || type === 'outline') && itemIndex === null)) return;
  const code = String(Math.floor(1000 + Math.random() * 9000));
  pendingDeletion = { type, code, book: activeBook, chapter: activeChapterIndex, item: itemIndex };
  document.querySelector('#deleteTitle').textContent = type === 'work' ? '删除这部作品？' : type === 'chapter' ? '删除这一章？' : type === 'character' ? '删除这个人物？' : type === 'event' ? '删除这个事件？' : type === 'outline' ? '删除这条情节？' : '删除这条素材？';
  document.querySelector('#deleteHint').textContent = type === 'work' ? `《${activeBook}》及其全部章节、素材和创作资料将被移入回收站。` : type === 'chapter' ? '这一章的标题和正文将被移入回收站。' : type === 'character' ? '这个人物会从谱系图中移除并移入回收站。' : type === 'event' ? '这个事件将被移入回收站。' : type === 'outline' ? '这条情节大纲将被移入回收站。' : '这条素材及其标签将被移入回收站。';
  document.querySelector('#deleteCode').textContent = code;
  document.querySelector('#deleteCodeInput').value = '';
  document.querySelector('#deleteConfirm').disabled = true;
  document.querySelector('#deleteModal').hidden = false;
  setTimeout(() => document.querySelector('#deleteCodeInput').focus(), 0);
}
function closeDeleteModal() { pendingDeletion = null; document.querySelector('#deleteModal').hidden = true; }
function confirmDeletion() {
  if (!pendingDeletion) return;
  if (pendingDeletion.type === 'work') {
    moveToTrash('work', pendingDeletion.book, books[pendingDeletion.book]);
    delete books[pendingDeletion.book];
    activeBook = Object.keys(books)[0] || null;
    if (activeBook) localStorage.setItem('mojian-active-book', activeBook); else localStorage.removeItem('mojian-active-book');
    saveBooks(); closeDeleteModal(); renderBookControls(); renderWorkList(); refreshScopedViews(); showPage('作品'); notify('作品已删除');
  } else if (pendingDeletion.type === 'chapter') {
    moveToTrash('chapter', pendingDeletion.book, books[pendingDeletion.book].chapters[pendingDeletion.chapter], pendingDeletion.chapter);
    books[pendingDeletion.book].chapters.splice(pendingDeletion.chapter, 1);
    activeChapterIndex = null; saveBooks(); closeDeleteModal(); renderBookControls(); renderWorkList(); renderChapters(); showPage('章节'); notify('章节已删除');
  } else {
    const key = pendingDeletion.type === 'character' ? 'characters' : pendingDeletion.type === 'event' ? 'events' : pendingDeletion.type === 'outline' ? 'outlines' : 'materials';
    moveToTrash(pendingDeletion.type, pendingDeletion.book, books[pendingDeletion.book][key][pendingDeletion.item], pendingDeletion.item);
    books[pendingDeletion.book][key].splice(pendingDeletion.item, 1);
    saveBooks(); closeDeleteModal(); pendingDeletion.type === 'character' ? renderCharacters() : pendingDeletion.type === 'event' ? renderTimeline() : pendingDeletion.type === 'outline' ? renderOutlines() : renderMaterials(); notify(pendingDeletion.type === 'character' ? '人物已删除' : pendingDeletion.type === 'event' ? '事件已删除' : pendingDeletion.type === 'outline' ? '情节已删除' : '素材已删除');
  }
}
function exportChapters(name, chapters) { const book = books[name]; return `墨间 · 稿件导出\n\n《${name}》\n${book.genre ? `题材：${book.genre}\n` : ''}${chapters.reduce((sum, item) => sum + (item.words || 0), 0).toLocaleString()} 字\n\n${chapters.map(item => `# ${item.title}\n${item.body || ''}`).join('\n\n')}`; }
function exportBook(name) { return exportChapters(name, books[name].chapters); }
function publishChecks(name) { const chapters = books[name].chapters || []; return chapters.flatMap((item, index) => [!item.title || item.title === '未命名章节' ? `第 ${index + 1} 章尚未命名` : '', !String(item.body || '').trim() ? `第 ${index + 1} 章正文为空` : '', item.status === '草稿' ? `第 ${index + 1} 章仍为草稿` : ''].filter(Boolean)); }
function downloadText(content, filename) { const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }

document.querySelector('#workForm').addEventListener('submit', event => { event.preventDefault(); const name = document.querySelector('#workTitle').value.trim(); const genre = document.querySelector('#workGenre').value.trim(); if (books[name]) { notify('已存在同名作品'); return; } const now = new Date().toISOString(); books[name] = { genre, chapters: [], characters: [], events: [], outlines: [], materials: [], createdAt: now, updatedAt: now }; setActiveBook(name); saveBooks(); renderBookControls(); renderWorkList(); refreshScopedViews(); event.target.reset(); showPage('作品'); notify(`《${name}》已创建`); });
const syncToggle = document.querySelector('#syncToggle'); const syncOn = localStorage.getItem('mojian-sync') === 'on'; syncToggle.checked = syncOn; const syncStatus = document.querySelector('#syncStatus'); const autoSyncCopy = syncToggle.closest('.setting-row').querySelector('div p'); autoSyncCopy?.remove(); syncToggle.closest('.setting-row').querySelector('div').append(syncStatus); setSyncStatus('需登录同步账户');
syncToggle.addEventListener('change', async () => { const enabled = syncToggle.checked; localStorage.setItem('mojian-sync', enabled ? 'on' : 'off'); const user = window.mojianCloud ? await window.mojianCloud.getUser() : null; renderSyncAccount(user); if (enabled && user) queueCloudSave(); notify(enabled ? '自动同步已开启' : '自动同步已关闭'); });
document.querySelector('#exportButton').addEventListener('click', () => { const names = Object.keys(books); if (!names.length) { notify('请先创建作品'); return; } const checks = names.flatMap(name => publishChecks(name).map(item => `《${name}》：${item}`)); const report = checks.length ? `\n\n--- 发布前检查 ---\n${checks.map(item => `- ${item}`).join('\n')}` : '\n\n--- 发布前检查 ---\n全部通过'; downloadText(names.map(exportBook).join('\n\n') + report, '墨间-全部稿件.txt'); notify(checks.length ? `已导出，附 ${checks.length} 条发布提醒` : '已导出全部稿件，检查通过'); });
document.querySelector('#publishOpen').addEventListener('click', openPublishPage);
document.querySelector('#publishBack').addEventListener('click', () => showPage('设置'));
document.querySelector('#publishBookSelect').addEventListener('change', event => { setActiveBook(event.target.value); renderBookControls(); refreshScopedViews(); renderPublishQueue(); });
document.querySelector('#publishForm').addEventListener('submit', event => { event.preventDefault(); const chapter = scoped('chapters')[publishingChapterIndex]; if (!chapter) return; chapter.status = '已发布'; (chapter.publishRecords ||= []).push({ platform: document.querySelector('#publishPlatform').value.trim(), publishedAt: document.querySelector('#publishedAt').value || new Date().toISOString(), url: document.querySelector('#publishUrl').value.trim() }); saveBooks(); renderDashboard(); event.target.reset(); event.target.hidden = true; publishingChapterIndex = null; renderPublishQueue(); notify('发布记录已保存'); });
document.querySelector('#backupExport').addEventListener('click', () => { downloadText(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...cloudState() }, null, 2), `墨间-本地备份-${new Date().toISOString().slice(0, 10)}.json`); notify('完整备份已导出'); });
document.querySelector('#backupImport').addEventListener('click', () => document.querySelector('#backupFile').click());
document.querySelector('#backupFile').addEventListener('change', event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(reader.result); if (!data?.books || !confirm('导入会覆盖当前所有本地内容，确定继续吗？')) return; applyCloudState(data); notify('本地备份已导入'); } catch { notify('备份文件无效，无法导入'); } finally { event.target.value = ''; } }; reader.readAsText(file); });
document.querySelector('#trashOpen').addEventListener('click', openTrash);
document.querySelector('#trashBack').addEventListener('click', () => showPage('设置'));
document.querySelector('#syncAccountOpen').addEventListener('click', openSyncPage);
document.querySelector('#syncBack').addEventListener('click', () => showPage('设置'));
document.querySelector('#syncForm').addEventListener('submit', async event => { event.preventDefault(); try { const user = await window.mojianCloud.signIn(document.querySelector('#syncEmail').value.trim(), document.querySelector('#syncPassword').value); renderSyncAccount(user); const remote = await window.mojianCloud.loadState(); if (remote?.books) applyCloudState(remote); else queueCloudSave(); notify('登录成功，已开始同步'); } catch (error) { notify(error.message || '登录失败'); } });
document.querySelector('#syncSignUp').addEventListener('click', async () => { try { const user = await window.mojianCloud.signUp(document.querySelector('#syncEmail').value.trim(), document.querySelector('#syncPassword').value); if (user) { renderSyncAccount(user); queueCloudSave(); notify('注册成功，已开始同步'); } else notify('请查收邮箱验证邮件后再登录'); } catch (error) { notify(error.message || '注册失败'); } });
document.querySelector('#syncSignOut').addEventListener('click', async () => { try { await window.mojianCloud.signOut(); renderSyncAccount(null); notify('已退出同步账户'); } catch (error) { notify('退出失败'); } });
document.querySelector('#characterForm').addEventListener('submit', event => { event.preventDefault(); if (!ensureActiveBook()) return; const isEditing = editingCharacterIndex !== null; const data = { name: document.querySelector('#characterName').value.trim(), role: document.querySelector('#characterRole').value.trim(), relatedTo: document.querySelector('#characterRelated').value, relation: document.querySelector('#characterRelation').value.trim(), note: document.querySelector('#characterNote').value.trim() }; if (isEditing) { const previousName = scoped('characters')[editingCharacterIndex].name; scoped('characters')[editingCharacterIndex] = data; if (previousName !== data.name) scoped('characters').forEach(item => { if (item.relatedTo === previousName) item.relatedTo = data.name; }); } else scoped('characters').push(data); editingCharacterIndex = null; saveBooks(); renderCharacters(); event.target.reset(); openTool('#charactersPage'); notify(isEditing ? '角色已更新' : '角色已加入人物谱系图'); });
document.querySelector('#timelineForm').addEventListener('submit', event => { event.preventDefault(); if (!ensureActiveBook()) return; const isEditing = editingEventIndex !== null; const data = { time: document.querySelector('#eventTime').value.trim(), title: document.querySelector('#eventTitle').value.trim(), note: document.querySelector('#eventNote').value.trim() }; if (!isEditing) scoped('events').push(data); else scoped('events')[editingEventIndex] = data; saveBooks(); renderTimeline(); event.target.reset(); notify(isEditing ? '事件已更新' : '事件已保存到当前作品'); });
document.querySelector('#outlineForm').addEventListener('submit', event => { event.preventDefault(); if (!ensureActiveBook()) return; const data = { title: document.querySelector('#outlineTitle').value.trim(), chapter: document.querySelector('#outlineChapter').value.trim(), note: document.querySelector('#outlineNote').value.trim(), status: document.querySelector('#outlineStatus').value }; const editing = editingOutlineIndex !== null; if (editing) scoped('outlines')[editingOutlineIndex] = data; else scoped('outlines').unshift(data); editingOutlineIndex = null; saveBooks(); renderOutlines(); event.target.reset(); event.target.hidden = true; notify(editing ? '情节已更新' : '剧情大纲已保存到当前作品'); });
document.querySelector('#materialForm').addEventListener('submit', event => { event.preventDefault(); if (!ensureActiveBook()) return; const data = { type: document.querySelector('#materialType').value, title: document.querySelector('#materialTitle').value.trim(), content: document.querySelector('#materialContent').value.trim(), tags: document.querySelector('#materialTags').value.trim() }; const editing = editingMaterialIndex !== null; if (editing) scoped('materials')[editingMaterialIndex] = data; else scoped('materials').unshift(data); editingMaterialIndex = null; saveBooks(); renderMaterials(); event.target.reset(); showPage('素材'); notify(editing ? '素材已更新' : '素材已保存到当前作品'); });
document.querySelectorAll('[data-close-tool]').forEach(button => button.addEventListener('click', () => { showPage('作品'); document.querySelector('.tabbar .active')?.classList.remove('active'); document.querySelector('[data-page="作品"]').classList.add('active'); }));
document.querySelector('#characterAddButton').addEventListener('click', openCharacterForm);
document.querySelector('#characterEditButton').addEventListener('click', () => { characterEditMode = !characterEditMode; renderCharacters(); });
document.querySelector('#timelineAddButton').addEventListener('click', () => openTimelineForm());
document.querySelector('#outlineAddButton').addEventListener('click', () => openOutlineForm());
document.querySelector('#characterBack').addEventListener('click', () => openTool('#charactersPage'));
document.querySelector('#newWorkButton').addEventListener('click', openNewWork); document.querySelector('#newWorkBack').addEventListener('click', () => showPage('作品')); document.querySelector('#newMaterialButton').addEventListener('click', openMaterialForm); document.querySelector('#materialBack').addEventListener('click', () => showPage('素材'));
document.querySelectorAll('#materialFilters button').forEach(button => button.addEventListener('click', () => { activeMaterialFilter = button.dataset.filter; document.querySelector('#materialFilters .active')?.classList.remove('active'); button.classList.add('active'); renderMaterials(); }));
document.querySelector('#materialBookSelect').addEventListener('change', event => { setActiveBook(event.target.value); renderBookControls(); refreshScopedViews(); });
document.querySelector('#newChapterButton').addEventListener('click', () => { if (!ensureActiveBook()) { notify('请先在作品页创建或选择一部作品'); return; } books[activeBook].chapters.push({ title: '未命名章节', body: '', words: 0, status: '草稿', volume: '' }); saveBooks(); openEditor(books[activeBook].chapters.length - 1); });
document.querySelector('#chapterSearch').addEventListener('input', renderChapters);
document.querySelector('#chapterTitleInput').addEventListener('input', updateEditorMeta); document.querySelector('#chapterVolume').addEventListener('input', updateEditorMeta); document.querySelector('#chapterStatus').addEventListener('change', updateEditorMeta); document.querySelector('#chapterBodyInput').addEventListener('input', updateEditorMeta); document.querySelector('#editorBack').addEventListener('click', closeEditor); document.querySelector('#chapterDone').addEventListener('click', () => { updateEditorMeta(); notify('章节已保存'); closeEditor(); });
document.querySelector('#chapterExport').addEventListener('click', () => { if (activeChapterIndex === null || !books[activeBook]) return; updateEditorMeta(); const chapter = books[activeBook].chapters[activeChapterIndex]; downloadText(exportChapters(activeBook, [chapter]), `墨间-${chapter.title}.txt`); notify('当前章节已导出'); });
document.querySelector('#chapterDelete').addEventListener('click', () => requestDeletion('chapter'));
document.querySelector('#detailBack').addEventListener('click', () => { showPage('作品'); document.querySelector('.tabbar .active')?.classList.remove('active'); document.querySelector('[data-page="作品"]').classList.add('active'); });
document.querySelector('#detailOpenChapters').addEventListener('click', () => { renderChapters(); document.querySelector('.tabbar .active')?.classList.remove('active'); document.querySelector('[data-page="章节"]').classList.add('active'); showPage('章节'); });
document.querySelector('#workDelete').addEventListener('click', () => requestDeletion('work'));
document.querySelector('#deleteCodeInput').addEventListener('input', event => { document.querySelector('#deleteConfirm').disabled = !pendingDeletion || event.target.value !== pendingDeletion.code; });
document.querySelector('#deleteCancel').addEventListener('click', closeDeleteModal);
document.querySelector('#deleteConfirm').addEventListener('click', confirmDeletion);
document.querySelector('#bookSwitch').addEventListener('click', () => { bookMenu.hidden = !bookMenu.hidden; });
document.querySelectorAll('[data-tool-book-switch]').forEach(button => button.addEventListener('click', openToolBookMenu));
document.querySelectorAll('.tool-card').forEach(button => button.addEventListener('click', () => { const name = button.querySelector('span').textContent; openTool(name === '人物设定' ? '#charactersPage' : name === '故事时间线' ? '#timelinePage' : '#outlinePage'); }));
document.querySelectorAll('.tabbar button[data-page]').forEach(button => button.addEventListener('click', () => { document.querySelector('.tabbar .active')?.classList.remove('active'); button.classList.add('active'); showPage(button.dataset.page); if (button.dataset.page === '章节') renderChapters(); if (button.dataset.page === '素材') refreshScopedViews(); }));
renderBookControls(); renderWorkList(); refreshScopedViews(); renderTrash();
window.addEventListener('mojian-cloud-ready', initialiseCloud);
if ('serviceWorker' in navigator) {
  let registration;
  const checkForUpdate = () => registration?.update().catch(() => {});
  const reloadForUpdate = () => {
    if (screen.classList.contains('show-editor')) { updateReloadQueued = true; return; }
    window.location.reload();
  };
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then(result => {
    registration = result;
    checkForUpdate();
    result.addEventListener('updatefound', () => {
      const worker = result.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) worker.postMessage({ type: 'SKIP_WAITING' }); });
    });
  }).catch(() => {}));
  navigator.serviceWorker.addEventListener('controllerchange', reloadForUpdate);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
  window.addEventListener('online', checkForUpdate);
}
