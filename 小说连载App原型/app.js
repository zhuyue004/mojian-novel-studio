const toast = document.querySelector('.toast');
const screen = document.querySelector('.screen');
const settingsPage = document.querySelector('.settings-page');
const chaptersPage = document.querySelector('.chapters-page');
const editorPage = document.querySelector('.editor-page');
const detailPage = document.querySelector('.detail-page');
const addWorkPage = document.querySelector('.add-work-page');
const toolPages = document.querySelectorAll('.tool-page');
const bookMenu = document.querySelector('#bookMenu');
const chapterList = document.querySelector('.chapter-list');
const exportBookSelect = document.querySelector('#exportBook');
const books = JSON.parse(localStorage.getItem('mojian-books') || '{}');
const characters = JSON.parse(localStorage.getItem('mojian-characters') || '[]');
const events = JSON.parse(localStorage.getItem('mojian-events') || '[]');
let activeBook = null;
let activeChapterIndex = null;

function notify(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function saveBooks() { localStorage.setItem('mojian-books', JSON.stringify(books)); }
function bookCount(book) { const chapters = book.chapters || []; const words = chapters.reduce((sum, item) => sum + (item.words || 0), 0); return `共 ${chapters.length} 章 · ${words.toLocaleString()} 字`; }
function showPage(page) {
  const chapters = page === '章节'; const settings = page === '设置';
  screen.classList.toggle('show-chapters', chapters); screen.classList.toggle('show-settings', settings); screen.classList.remove('show-tool', 'show-editor', 'show-detail', 'show-add-work');
  chaptersPage.classList.toggle('is-visible', chapters); settingsPage.classList.toggle('is-visible', settings); editorPage.classList.remove('is-visible'); detailPage.classList.remove('is-visible'); addWorkPage.classList.remove('is-visible'); toolPages.forEach(item => item.classList.remove('is-visible'));
  if (!chapters) bookMenu.hidden = true;
}
function openTool(id) { showPage('作品'); screen.classList.add('show-tool'); document.querySelector(id).classList.add('is-visible'); }
function openNewWork() { showPage('作品'); screen.classList.add('show-add-work'); addWorkPage.classList.add('is-visible'); document.querySelector('#workTitle').focus(); }
function renderBookControls() {
  const names = Object.keys(books); const canUseBooks = names.length > 0;
  document.querySelector('#bookSwitch').disabled = !canUseBooks;
  document.querySelector('#newChapterButton').disabled = !canUseBooks;
  bookMenu.innerHTML = names.map(name => `<button data-book="${escapeHtml(name)}">${escapeHtml(name)} <small>${bookCount(books[name])}</small></button>`).join('');
  exportBookSelect.innerHTML = names.map(name => `<option>${escapeHtml(name)}</option>`).join('');
  exportBookSelect.disabled = !canUseBooks; document.querySelector('#toolExportButton').disabled = !canUseBooks;
  document.querySelectorAll('#bookMenu button').forEach(button => button.addEventListener('click', () => { renderChapters(button.dataset.book); bookMenu.hidden = true; }));
  if (canUseBooks && (!activeBook || !books[activeBook])) renderChapters(names[0]); else if (!canUseBooks) renderChapters(null);
  renderExportSummary();
}
function renderChapters(bookName) {
  activeBook = bookName; const book = bookName ? books[bookName] : null;
  document.querySelector('#currentBook').textContent = book ? bookName : '还没有作品'; document.querySelector('#chapterCount').textContent = book ? bookCount(book) : '先在作品页创建一部小说';
  if (!book || !book.chapters.length) { chapterList.innerHTML = `<div class="chapter-empty"><b>○</b>${book ? '还没有章节，准备好后开始写第一章。' : '创建作品后，章节会显示在这里。'}</div>`; return; }
  chapterList.innerHTML = book.chapters.map((item, index) => `<button class="chapter-row"><span class="chapter-no">第 ${index + 1} 章</span><span class="chapter-title">${escapeHtml(item.title)}</span><span class="chapter-meta">${item.status || '草稿'} · ${(item.words || 0).toLocaleString()} 字</span><b>›</b></button>`).join('');
  document.querySelectorAll('.chapter-row').forEach((row, index) => row.addEventListener('click', () => openEditor(index)));
}
function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}
function renderWorkList() {
  const names = Object.keys(books);
  document.querySelector('#workTotal').textContent = `${names.length} 部`;
  document.querySelector('#workList').innerHTML = names.map(name => {
    const book = books[name];
    return `<button class="work-item" data-work="${escapeHtml(name)}"><span class="work-item-cover">${escapeHtml(name.slice(0, 1))}</span><span><h3>${escapeHtml(name)}</h3><p>${escapeHtml(book.genre || '未填写题材')} · ${bookCount(book)}</p></span><b>›</b></button>`;
  }).join('');
  document.querySelectorAll('.work-item').forEach(button => button.addEventListener('click', () => showWorkDetails(button.dataset.work)));
}
function showWorkDetails(name) {
  const book = books[name];
  if (!book) return;
  activeBook = name;
  screen.classList.remove('show-chapters', 'show-settings', 'show-tool', 'show-editor');
  chaptersPage.classList.remove('is-visible'); settingsPage.classList.remove('is-visible'); editorPage.classList.remove('is-visible'); toolPages.forEach(item => item.classList.remove('is-visible'));
  screen.classList.add('show-detail'); detailPage.classList.add('is-visible');
  document.querySelector('#detailTitle').textContent = name;
  document.querySelector('#detailGenre').textContent = book.genre || '未填写题材';
  document.querySelector('#detailGenreInfo').textContent = book.genre || '未填写';
  document.querySelector('#detailChapters').textContent = book.chapters.length;
  document.querySelector('#detailWords').textContent = book.chapters.reduce((sum, item) => sum + (item.words || 0), 0).toLocaleString();
  const start = book.createdAt ? new Date(book.createdAt) : new Date();
  document.querySelector('#detailDays').textContent = `${start.getMonth() + 1}/${start.getDate()}`;
  document.querySelector('#detailUpdated').textContent = book.updatedAt ? formatDate(book.updatedAt) : '暂无修改';
}
function openEditor(index) {
  if (!activeBook || !books[activeBook]) return;
  activeChapterIndex = index;
  const chapter = books[activeBook].chapters[index];
  screen.classList.remove('show-chapters', 'show-settings', 'show-tool');
  chaptersPage.classList.remove('is-visible'); settingsPage.classList.remove('is-visible'); toolPages.forEach(item => item.classList.remove('is-visible'));
  screen.classList.add('show-editor'); editorPage.classList.add('is-visible');
  document.querySelector('#chapterTitleInput').value = chapter.title || '';
  document.querySelector('#chapterBodyInput').value = chapter.body || '';
  updateEditorMeta();
}
function updateEditorMeta() {
  if (activeChapterIndex === null || !books[activeBook]) return;
  const chapter = books[activeBook].chapters[activeChapterIndex];
  chapter.title = document.querySelector('#chapterTitleInput').value.trim() || '未命名章节';
  chapter.body = document.querySelector('#chapterBodyInput').value;
  chapter.words = chapter.body.replace(/\s/g, '').length;
  chapter.status = '草稿';
  books[activeBook].updatedAt = new Date().toISOString();
  saveBooks();
  document.querySelector('#wordCount').textContent = `${chapter.words.toLocaleString()} 字`;
  document.querySelector('#editorState').textContent = '已自动保存';
}
function closeEditor() {
  updateEditorMeta(); renderBookControls(); renderChapters(activeBook); showPage('章节'); chaptersPage.classList.add('is-visible'); screen.classList.add('show-chapters');
}
function renderCharacters() { document.querySelector('#characterList').innerHTML = characters.map(item => `<article class="character-item"><h3>${escapeHtml(item.name)}</h3><span>${escapeHtml(item.role)}</span><p>${escapeHtml(item.note || '暂无补充设定')}</p></article>`).join(''); document.querySelector('#characterCount').textContent = characters.length ? `${characters.length} 个角色` : '还没有角色'; }
function renderTimeline() { document.querySelector('#timelineList').innerHTML = events.map(item => `<article class="timeline-item"><time>${escapeHtml(item.time)}</time><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.note || '暂无补充说明')}</p></article>`).join(''); document.querySelector('#eventCount').textContent = events.length ? `${events.length} 条事件` : '还没有事件'; }
function exportBook(name) { const book = books[name]; return `墨间 · 稿件导出\n\n《${name}》\n${book.genre ? `题材：${book.genre}\n` : ''}${bookCount(book)}\n\n${book.chapters.map((item, index) => `第 ${index + 1} 章  ${item.title}\n${item.status || '草稿'} · ${(item.words || 0).toLocaleString()} 字\n`).join('\n')}`; }
function downloadText(content, filename) { const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }
function renderExportSummary() { const name = exportBookSelect.value; document.querySelector('#exportSummary').textContent = name ? `${bookCount(books[name])} · 将导出章节标题、状态与字数` : '请先创建作品。'; }

document.querySelector('#workForm').addEventListener('submit', event => { event.preventDefault(); const name = document.querySelector('#workTitle').value.trim(); const genre = document.querySelector('#workGenre').value.trim(); if (books[name]) { notify('已存在同名作品'); return; } const now = new Date().toISOString(); books[name] = { genre, chapters: [], createdAt: now, updatedAt: now }; saveBooks(); activeBook = name; renderBookControls(); renderWorkList(); event.target.reset(); showPage('作品'); notify(`《${name}》已创建`); });
const syncToggle = document.querySelector('#syncToggle'); const syncStatus = document.querySelector('#syncStatus'); const syncOn = localStorage.getItem('mojian-sync') !== 'off'; syncToggle.checked = syncOn; syncStatus.textContent = syncOn ? '已开启 · 联网时将自动备份稿件' : '已关闭 · 稿件仅保存在此设备';
syncToggle.addEventListener('change', () => { const enabled = syncToggle.checked; localStorage.setItem('mojian-sync', enabled ? 'on' : 'off'); syncStatus.textContent = enabled ? '已开启 · 联网时将自动备份稿件' : '已关闭 · 稿件仅保存在此设备'; notify(enabled ? '自动同步已开启' : '自动同步已关闭'); });
document.querySelector('#exportButton').addEventListener('click', () => { const names = Object.keys(books); if (!names.length) { notify('请先创建作品'); return; } downloadText(names.map(exportBook).join('\n\n'), '墨间-全部稿件.txt'); notify('已导出全部稿件'); });
document.querySelector('#toolExportButton').addEventListener('click', () => { const name = exportBookSelect.value; if (name) { downloadText(exportBook(name), `墨间-${name}.txt`); notify(`已导出《${name}》`); } });
exportBookSelect.addEventListener('change', renderExportSummary);
document.querySelector('#characterForm').addEventListener('submit', event => { event.preventDefault(); characters.unshift({ name: document.querySelector('#characterName').value.trim(), role: document.querySelector('#characterRole').value.trim(), note: document.querySelector('#characterNote').value.trim() }); localStorage.setItem('mojian-characters', JSON.stringify(characters)); renderCharacters(); event.target.reset(); notify('角色设定已保存'); });
document.querySelector('#timelineForm').addEventListener('submit', event => { event.preventDefault(); events.push({ time: document.querySelector('#eventTime').value.trim(), title: document.querySelector('#eventTitle').value.trim(), note: document.querySelector('#eventNote').value.trim() }); localStorage.setItem('mojian-events', JSON.stringify(events)); renderTimeline(); event.target.reset(); notify('时间线事件已保存'); });
document.querySelectorAll('[data-close-tool]').forEach(button => button.addEventListener('click', () => { showPage('作品'); document.querySelector('.tabbar .active')?.classList.remove('active'); document.querySelector('[data-page="作品"]').classList.add('active'); }));
document.querySelector('#newWorkButton').addEventListener('click', openNewWork);
document.querySelector('#newWorkBack').addEventListener('click', () => showPage('作品'));
document.querySelector('#newChapterButton').addEventListener('click', () => {
  if (!activeBook || !books[activeBook]) return;
  books[activeBook].chapters.push({ title: '未命名章节', body: '', words: 0, status: '草稿' });
  saveBooks(); openEditor(books[activeBook].chapters.length - 1);
});
document.querySelector('#chapterTitleInput').addEventListener('input', updateEditorMeta);
document.querySelector('#chapterBodyInput').addEventListener('input', updateEditorMeta);
document.querySelector('#editorBack').addEventListener('click', closeEditor);
document.querySelector('#chapterDone').addEventListener('click', () => { updateEditorMeta(); notify('章节已保存'); closeEditor(); });
document.querySelector('#detailBack').addEventListener('click', () => { showPage('作品'); document.querySelector('.tabbar .active')?.classList.remove('active'); document.querySelector('[data-page="作品"]').classList.add('active'); });
document.querySelector('#detailOpenChapters').addEventListener('click', () => { renderChapters(activeBook); document.querySelector('.tabbar .active')?.classList.remove('active'); document.querySelector('[data-page="章节"]').classList.add('active'); showPage('章节'); });
document.querySelector('#bookSwitch').addEventListener('click', () => { bookMenu.hidden = !bookMenu.hidden; });
document.querySelectorAll('.tool-card').forEach(button => button.addEventListener('click', () => { const name = button.querySelector('span').textContent; openTool(name === '人物设定' ? '#charactersPage' : name === '故事时间线' ? '#timelinePage' : '#exportPage'); }));
document.querySelectorAll('.tabbar button[data-page]').forEach(button => button.addEventListener('click', () => { document.querySelector('.tabbar .active')?.classList.remove('active'); button.classList.add('active'); const page = button.dataset.page; showPage(page); if (page === '素材') notify('素材库即将开放'); }));
renderBookControls(); renderWorkList(); renderCharacters(); renderTimeline();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
