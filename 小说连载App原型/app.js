const toast = document.querySelector('.toast');
const screen = document.querySelector('.screen');
const settingsPage = document.querySelector('.settings-page');
const chaptersPage = document.querySelector('.chapters-page');
const editorPage = document.querySelector('.editor-page');
const detailPage = document.querySelector('.detail-page');
const addWorkPage = document.querySelector('.add-work-page');
const materialsPage = document.querySelector('.materials-page');
const addMaterialPage = document.querySelector('.add-material-page');
const toolPages = document.querySelectorAll('.tool-page');
const bookMenu = document.querySelector('#bookMenu');
const chapterList = document.querySelector('.chapter-list');
const books = JSON.parse(localStorage.getItem('mojian-books') || '{}');
let activeBook = localStorage.getItem('mojian-active-book');
let activeChapterIndex = null;
let activeMaterialFilter = '全部';
let pendingDeletion = null;

document.body.insertAdjacentHTML('beforeend', '<div id="deleteModal" class="delete-modal" hidden><div class="delete-dialog"><h2 id="deleteTitle">确认删除？</h2><p id="deleteHint"></p><p class="delete-code">请输入 <b id="deleteCode">0000</b> 确认</p><input id="deleteCodeInput" inputmode="numeric" maxlength="4" placeholder="输入四位数字"><div class="delete-actions"><button id="deleteCancel">取消</button><button id="deleteConfirm" disabled>确认删除</button></div></div></div>');

Object.values(books).forEach(book => {
  book.chapters ||= []; book.characters ||= []; book.events ||= []; book.outlines ||= []; book.materials ||= [];
});

function notify(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function saveBooks() { localStorage.setItem('mojian-books', JSON.stringify(books)); }
function bookCount(book) { const chapters = book.chapters || []; const words = chapters.reduce((sum, item) => sum + (item.words || 0), 0); return `共 ${chapters.length} 章 · ${words.toLocaleString()} 字`; }
function setActiveBook(name) { if (!name || !books[name]) return false; activeBook = name; localStorage.setItem('mojian-active-book', name); return true; }
function scoped(key) { return activeBook && books[activeBook] ? books[activeBook][key] : []; }
function contextName() { return activeBook ? `《${activeBook}》` : '请先选择作品'; }
function ensureActiveBook() { const names = Object.keys(books); if (!books[activeBook] && names.length) setActiveBook(names[0]); return Boolean(activeBook && books[activeBook]); }

function showPage(page) {
  const chapters = page === '章节'; const settings = page === '设置'; const materials = page === '素材';
  screen.classList.toggle('show-chapters', chapters); screen.classList.toggle('show-settings', settings); screen.classList.toggle('show-materials', materials); screen.classList.remove('show-tool', 'show-editor', 'show-detail', 'show-add-work', 'show-add-material');
  chaptersPage.classList.toggle('is-visible', chapters); settingsPage.classList.toggle('is-visible', settings); materialsPage.classList.toggle('is-visible', materials); editorPage.classList.remove('is-visible'); detailPage.classList.remove('is-visible'); addWorkPage.classList.remove('is-visible'); addMaterialPage.classList.remove('is-visible'); toolPages.forEach(item => item.classList.remove('is-visible'));
  if (!chapters) bookMenu.hidden = true;
}
function openTool(id) { if (!ensureActiveBook()) { notify('请先创建并选择一部作品'); return; } refreshScopedViews(); showPage('作品'); screen.classList.add('show-tool'); document.querySelector(id).classList.add('is-visible'); }
function openNewWork() { showPage('作品'); screen.classList.add('show-add-work'); addWorkPage.classList.add('is-visible'); document.querySelector('#workTitle').focus(); }
function openMaterialForm() { if (!ensureActiveBook()) { notify('请先创建并选择一部作品'); return; } refreshScopedViews(); showPage('作品'); screen.classList.add('show-add-material'); addMaterialPage.classList.add('is-visible'); }

function renderBookControls() {
  const names = Object.keys(books); const ready = ensureActiveBook();
  document.querySelector('#bookSwitch').disabled = !ready; document.querySelector('#newChapterButton').disabled = false;
  bookMenu.innerHTML = names.map(name => `<button data-book="${escapeHtml(name)}">${escapeHtml(name)} <small>${bookCount(books[name])}</small></button>`).join('');
  document.querySelectorAll('#bookMenu button').forEach(button => button.addEventListener('click', () => { setActiveBook(button.dataset.book); renderChapters(); refreshScopedViews(); bookMenu.hidden = true; }));
  const materialSelect = document.querySelector('#materialBookSelect');
  materialSelect.innerHTML = ready ? names.map(name => `<option ${name === activeBook ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('') : '<option>请先创建作品</option>';
  materialSelect.disabled = !ready;
  if (!ready) renderChapters(); else renderChapters();
}
function renderChapters() {
  const book = activeBook ? books[activeBook] : null;
  document.querySelector('#currentBook').textContent = book ? activeBook : '还没有作品'; document.querySelector('#chapterCount').textContent = book ? bookCount(book) : '先在作品页创建一部小说';
  if (!book || !book.chapters.length) { chapterList.innerHTML = `<div class="chapter-empty"><b>○</b>${book ? '还没有章节，准备好后开始写第一章。' : '创建作品后，章节会显示在这里。'}</div>`; return; }
  chapterList.innerHTML = book.chapters.map((item, index) => `<button class="chapter-row"><span class="chapter-no">第 ${index + 1} 章</span><span class="chapter-title">${escapeHtml(item.title)}</span><span class="chapter-meta">${item.status || '草稿'} · ${(item.words || 0).toLocaleString()} 字</span><b>›</b></button>`).join('');
  document.querySelectorAll('.chapter-row').forEach((row, index) => row.addEventListener('click', () => openEditor(index)));
}
function formatDate(value) { const date = value ? new Date(value) : new Date(); return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`; }
function renderWorkList() {
  const names = Object.keys(books); document.querySelector('#workTotal').textContent = `${names.length} 部`;
  document.querySelector('#workList').innerHTML = names.map(name => { const book = books[name]; return `<button class="work-item" data-work="${escapeHtml(name)}"><span class="work-item-cover">${escapeHtml(name.slice(0, 1))}</span><span><h3>${escapeHtml(name)}</h3><p>${escapeHtml(book.genre || '未填写题材')} · ${bookCount(book)}</p></span><b>›</b></button>`; }).join('');
  document.querySelectorAll('.work-item').forEach(button => button.addEventListener('click', () => showWorkDetails(button.dataset.work)));
}
function showWorkDetails(name) {
  if (!setActiveBook(name)) return; refreshScopedViews(); const book = books[name];
  screen.classList.remove('show-chapters', 'show-settings', 'show-materials', 'show-tool', 'show-editor', 'show-add-work', 'show-add-material'); chaptersPage.classList.remove('is-visible'); settingsPage.classList.remove('is-visible'); materialsPage.classList.remove('is-visible'); editorPage.classList.remove('is-visible'); addWorkPage.classList.remove('is-visible'); addMaterialPage.classList.remove('is-visible'); toolPages.forEach(item => item.classList.remove('is-visible'));
  screen.classList.add('show-detail'); detailPage.classList.add('is-visible');
  document.querySelector('#detailTitle').textContent = name; document.querySelector('#detailGenre').textContent = book.genre || '未填写题材'; document.querySelector('#detailGenreInfo').textContent = book.genre || '未填写'; document.querySelector('#detailChapters').textContent = book.chapters.length; document.querySelector('#detailWords').textContent = book.chapters.reduce((sum, item) => sum + (item.words || 0), 0).toLocaleString();
  document.querySelector('#detailCreatedAt').textContent = `创建于 ${formatDate(book.createdAt)}`; document.querySelector('#detailUpdated').textContent = book.updatedAt ? formatDate(book.updatedAt) : '暂无修改';
}
function renderCharacters() { const items = scoped('characters'); document.querySelector('#characterWorkContext').textContent = contextName(); document.querySelector('#characterList').innerHTML = items.map(item => `<article class="character-item"><h3>${escapeHtml(item.name)}</h3><span>${escapeHtml(item.role)}</span><p>${escapeHtml(item.note || '暂无补充设定')}</p></article>`).join(''); document.querySelector('#characterCount').textContent = activeBook ? (items.length ? `${items.length} 个角色` : '还没有角色') : '选择作品后查看'; }
function renderTimeline() { const items = scoped('events'); document.querySelector('#timelineWorkContext').textContent = contextName(); document.querySelector('#timelineList').innerHTML = items.map(item => `<article class="timeline-item"><time>${escapeHtml(item.time)}</time><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.note || '暂无补充说明')}</p></article>`).join(''); document.querySelector('#eventCount').textContent = activeBook ? (items.length ? `${items.length} 条事件` : '还没有事件') : '选择作品后查看'; }
function renderOutlines() { const items = scoped('outlines'); document.querySelector('#outlineWorkContext').textContent = contextName(); document.querySelector('#outlineList').innerHTML = items.map(item => `<article class="outline-item"><div class="outline-item-head"><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.note || '暂无补充说明')}</p><small>${escapeHtml(item.chapter || '未关联章节')}</small></article>`).join(''); document.querySelector('#outlineCount').textContent = activeBook ? (items.length ? `${items.length} 条情节` : '还没有情节') : '选择作品后查看'; }
function renderMaterials() { const items = scoped('materials'); const list = (activeMaterialFilter === '全部' ? items : items.filter(item => item.type === activeMaterialFilter)).map(item => ({ item, index: items.indexOf(item) })); document.querySelector('#materialList').innerHTML = activeBook && list.length ? list.map(({ item, index }) => `<article class="material-item"><span class="material-item-head"><span class="material-type">${escapeHtml(item.type)}</span><span class="material-work">${escapeHtml(activeBook)}</span></span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)}</p>${item.tags ? `<span class="material-tags"># ${escapeHtml(item.tags)}</span>` : ''}<button class="material-delete" data-material-index="${index}">删除</button></article>`).join('') : `<div class="material-empty"><b>◇</b>${activeBook ? `还没有${activeMaterialFilter === '全部' ? '素材' : activeMaterialFilter + '素材'}，点击右上角新增一条吧。` : '请选择或创建一部作品。'}</div>`; document.querySelectorAll('.material-delete').forEach(button => button.addEventListener('click', () => requestDeletion('material', Number(button.dataset.materialIndex)))); }
function refreshScopedViews() { renderCharacters(); renderTimeline(); renderOutlines(); renderMaterials(); document.querySelector('#materialWorkContext').textContent = contextName(); }

function openEditor(index) { if (!ensureActiveBook()) return; activeChapterIndex = index; const chapter = books[activeBook].chapters[index]; screen.classList.remove('show-chapters', 'show-settings', 'show-materials', 'show-tool'); chaptersPage.classList.remove('is-visible'); settingsPage.classList.remove('is-visible'); materialsPage.classList.remove('is-visible'); toolPages.forEach(item => item.classList.remove('is-visible')); screen.classList.add('show-editor'); editorPage.classList.add('is-visible'); document.querySelector('#chapterTitleInput').value = chapter.title || ''; document.querySelector('#chapterBodyInput').value = chapter.body || ''; updateEditorMeta(); }
function updateEditorMeta() { if (activeChapterIndex === null || !books[activeBook]) return; const chapter = books[activeBook].chapters[activeChapterIndex]; chapter.title = document.querySelector('#chapterTitleInput').value.trim() || '未命名章节'; chapter.body = document.querySelector('#chapterBodyInput').value; chapter.words = chapter.body.replace(/\s/g, '').length; chapter.status = '草稿'; books[activeBook].updatedAt = new Date().toISOString(); saveBooks(); document.querySelector('#wordCount').textContent = `${chapter.words.toLocaleString()} 字`; document.querySelector('#editorState').textContent = '已自动保存'; }
function closeEditor() { updateEditorMeta(); renderBookControls(); renderChapters(); showPage('章节'); chaptersPage.classList.add('is-visible'); screen.classList.add('show-chapters'); }
function requestDeletion(type, materialIndex = null) {
  if (!activeBook || (type === 'chapter' && activeChapterIndex === null) || (type === 'material' && materialIndex === null)) return;
  const code = String(Math.floor(1000 + Math.random() * 9000));
  pendingDeletion = { type, code, book: activeBook, chapter: activeChapterIndex, material: materialIndex };
  document.querySelector('#deleteTitle').textContent = type === 'work' ? '删除这部作品？' : type === 'chapter' ? '删除这一章？' : '删除这条素材？';
  document.querySelector('#deleteHint').textContent = type === 'work' ? `《${activeBook}》及其全部章节、素材和创作资料将被永久删除。` : type === 'chapter' ? '这一章的标题和正文将被永久删除。' : '这条素材及其标签将被永久删除。';
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
    delete books[pendingDeletion.book];
    activeBook = Object.keys(books)[0] || null;
    if (activeBook) localStorage.setItem('mojian-active-book', activeBook); else localStorage.removeItem('mojian-active-book');
    saveBooks(); closeDeleteModal(); renderBookControls(); renderWorkList(); refreshScopedViews(); showPage('作品'); notify('作品已删除');
  } else if (pendingDeletion.type === 'chapter') {
    books[pendingDeletion.book].chapters.splice(pendingDeletion.chapter, 1);
    activeChapterIndex = null; saveBooks(); closeDeleteModal(); renderBookControls(); renderWorkList(); renderChapters(); showPage('章节'); notify('章节已删除');
  } else {
    books[pendingDeletion.book].materials.splice(pendingDeletion.material, 1);
    saveBooks(); closeDeleteModal(); renderMaterials(); notify('素材已删除');
  }
}
function exportBook(name) { const book = books[name]; return `墨间 · 稿件导出\n\n《${name}》\n${book.genre ? `题材：${book.genre}\n` : ''}${bookCount(book)}\n\n${book.chapters.map((item, index) => `第 ${index + 1} 章  ${item.title}\n${item.status || '草稿'} · ${(item.words || 0).toLocaleString()} 字\n`).join('\n')}`; }
function downloadText(content, filename) { const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }

document.querySelector('#workForm').addEventListener('submit', event => { event.preventDefault(); const name = document.querySelector('#workTitle').value.trim(); const genre = document.querySelector('#workGenre').value.trim(); if (books[name]) { notify('已存在同名作品'); return; } const now = new Date().toISOString(); books[name] = { genre, chapters: [], characters: [], events: [], outlines: [], materials: [], createdAt: now, updatedAt: now }; setActiveBook(name); saveBooks(); renderBookControls(); renderWorkList(); refreshScopedViews(); event.target.reset(); showPage('作品'); notify(`《${name}》已创建`); });
const syncToggle = document.querySelector('#syncToggle'); const syncStatus = document.querySelector('#syncStatus'); const syncOn = localStorage.getItem('mojian-sync') !== 'off'; syncToggle.checked = syncOn; syncStatus.textContent = syncOn ? '已开启 · 联网时将自动备份稿件' : '已关闭 · 稿件仅保存在此设备';
syncToggle.addEventListener('change', () => { const enabled = syncToggle.checked; localStorage.setItem('mojian-sync', enabled ? 'on' : 'off'); syncStatus.textContent = enabled ? '已开启 · 联网时将自动备份稿件' : '已关闭 · 稿件仅保存在此设备'; notify(enabled ? '自动同步已开启' : '自动同步已关闭'); });
document.querySelector('#exportButton').addEventListener('click', () => { const names = Object.keys(books); if (!names.length) { notify('请先创建作品'); return; } downloadText(names.map(exportBook).join('\n\n'), '墨间-全部稿件.txt'); notify('已导出全部稿件'); });
document.querySelector('#characterForm').addEventListener('submit', event => { event.preventDefault(); if (!ensureActiveBook()) return; scoped('characters').unshift({ name: document.querySelector('#characterName').value.trim(), role: document.querySelector('#characterRole').value.trim(), note: document.querySelector('#characterNote').value.trim() }); saveBooks(); renderCharacters(); event.target.reset(); notify('角色设定已保存到当前作品'); });
document.querySelector('#timelineForm').addEventListener('submit', event => { event.preventDefault(); if (!ensureActiveBook()) return; scoped('events').push({ time: document.querySelector('#eventTime').value.trim(), title: document.querySelector('#eventTitle').value.trim(), note: document.querySelector('#eventNote').value.trim() }); saveBooks(); renderTimeline(); event.target.reset(); notify('时间线已保存到当前作品'); });
document.querySelector('#outlineForm').addEventListener('submit', event => { event.preventDefault(); if (!ensureActiveBook()) return; scoped('outlines').unshift({ title: document.querySelector('#outlineTitle').value.trim(), chapter: document.querySelector('#outlineChapter').value.trim(), note: document.querySelector('#outlineNote').value.trim(), status: document.querySelector('#outlineStatus').value }); saveBooks(); renderOutlines(); event.target.reset(); notify('剧情大纲已保存到当前作品'); });
document.querySelector('#materialForm').addEventListener('submit', event => { event.preventDefault(); if (!ensureActiveBook()) return; scoped('materials').unshift({ type: document.querySelector('#materialType').value, title: document.querySelector('#materialTitle').value.trim(), content: document.querySelector('#materialContent').value.trim(), tags: document.querySelector('#materialTags').value.trim() }); saveBooks(); renderMaterials(); event.target.reset(); showPage('素材'); notify('素材已保存到当前作品'); });
document.querySelectorAll('[data-close-tool]').forEach(button => button.addEventListener('click', () => { showPage('作品'); document.querySelector('.tabbar .active')?.classList.remove('active'); document.querySelector('[data-page="作品"]').classList.add('active'); }));
document.querySelector('#newWorkButton').addEventListener('click', openNewWork); document.querySelector('#newWorkBack').addEventListener('click', () => showPage('作品')); document.querySelector('#newMaterialButton').addEventListener('click', openMaterialForm); document.querySelector('#materialBack').addEventListener('click', () => showPage('素材'));
document.querySelectorAll('#materialFilters button').forEach(button => button.addEventListener('click', () => { activeMaterialFilter = button.dataset.filter; document.querySelector('#materialFilters .active')?.classList.remove('active'); button.classList.add('active'); renderMaterials(); }));
document.querySelector('#materialBookSelect').addEventListener('change', event => { setActiveBook(event.target.value); renderBookControls(); refreshScopedViews(); });
document.querySelector('#newChapterButton').addEventListener('click', () => { if (!ensureActiveBook()) { notify('请先在作品页创建或选择一部作品'); return; } books[activeBook].chapters.push({ title: '未命名章节', body: '', words: 0, status: '草稿' }); saveBooks(); openEditor(books[activeBook].chapters.length - 1); });
document.querySelector('#chapterTitleInput').addEventListener('input', updateEditorMeta); document.querySelector('#chapterBodyInput').addEventListener('input', updateEditorMeta); document.querySelector('#editorBack').addEventListener('click', closeEditor); document.querySelector('#chapterDone').addEventListener('click', () => { updateEditorMeta(); notify('章节已保存'); closeEditor(); });
document.querySelector('#chapterDelete').addEventListener('click', () => requestDeletion('chapter'));
document.querySelector('#detailBack').addEventListener('click', () => { showPage('作品'); document.querySelector('.tabbar .active')?.classList.remove('active'); document.querySelector('[data-page="作品"]').classList.add('active'); });
document.querySelector('#detailOpenChapters').addEventListener('click', () => { renderChapters(); document.querySelector('.tabbar .active')?.classList.remove('active'); document.querySelector('[data-page="章节"]').classList.add('active'); showPage('章节'); });
document.querySelector('#workDelete').addEventListener('click', () => requestDeletion('work'));
document.querySelector('#deleteCodeInput').addEventListener('input', event => { document.querySelector('#deleteConfirm').disabled = !pendingDeletion || event.target.value !== pendingDeletion.code; });
document.querySelector('#deleteCancel').addEventListener('click', closeDeleteModal);
document.querySelector('#deleteConfirm').addEventListener('click', confirmDeletion);
document.querySelector('#bookSwitch').addEventListener('click', () => { bookMenu.hidden = !bookMenu.hidden; });
document.querySelectorAll('.tool-card').forEach(button => button.addEventListener('click', () => { const name = button.querySelector('span').textContent; openTool(name === '人物设定' ? '#charactersPage' : name === '故事时间线' ? '#timelinePage' : '#outlinePage'); }));
document.querySelectorAll('.tabbar button[data-page]').forEach(button => button.addEventListener('click', () => { document.querySelector('.tabbar .active')?.classList.remove('active'); button.classList.add('active'); showPage(button.dataset.page); if (button.dataset.page === '章节') renderChapters(); if (button.dataset.page === '素材') refreshScopedViews(); }));
renderBookControls(); renderWorkList(); refreshScopedViews();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
