const toast = document.querySelector('.toast');
const screen = document.querySelector('.screen');
const settingsPage = document.querySelector('.settings-page');
const chaptersPage = document.querySelector('.chapters-page');
const toolPages = document.querySelectorAll('.tool-page');
const syncToggle = document.querySelector('#syncToggle');
const syncStatus = document.querySelector('#syncStatus');
const bookMenu = document.querySelector('#bookMenu');
const chapterList = document.querySelector('.chapter-list');

const books = {
  '雾港来信': { count: '共 26 章 · 48,620 字', chapters: [['第 26 章', '潮汐落下之前', '草稿 · 1,826 字'], ['第 25 章', '留在雾里的灯塔', '已完成 · 2,115 字'], ['第 24 章', '海鸥没有回答', '已完成 · 1,972 字'], ['第 23 章', '日落以后', '已完成 · 2,304 字'], ['第 22 章', '失而复得的车票', '已完成 · 1,885 字']] },
  '夏日来信': { count: '共 12 章 · 19,204 字', chapters: [['第 12 章', '一封未寄出的信', '草稿 · 1,204 字'], ['第 11 章', '栀子花开时', '已完成 · 1,876 字'], ['第 10 章', '雨天的电台', '已完成 · 1,642 字']] },
  '北方的白鲸': { count: '共 8 章 · 16,370 字', chapters: [['第 8 章', '雪落无声', '已完成 · 2,370 字'], ['第 7 章', '越过结冰的河', '已完成 · 2,088 字'], ['第 6 章', '白鲸的歌声', '已完成 · 1,907 字']] }
};
const defaultCharacters = [{ name: '林雾', role: '港口电台主持人', note: '习惯把秘密留在深夜节目里。' }, { name: '周沉', role: '灯塔管理员', note: '知道那场海难的真相，却始终沉默。' }];
const defaultEvents = [{ time: '十年前 · 夏末', title: '旧港口发生海难', note: '林雾失去父亲，周沉成为唯一的目击者。' }, { time: '第 1 章 · 雨夜', title: '匿名来信抵达电台', note: '信中写着一段无人承认的海难经过。' }];
let characters = JSON.parse(localStorage.getItem('mojian-characters') || JSON.stringify(defaultCharacters));
let events = JSON.parse(localStorage.getItem('mojian-events') || JSON.stringify(defaultEvents));

function notify(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function showPage(page) {
  const chapters = page === '章节'; const settings = page === '设置';
  screen.classList.toggle('show-chapters', chapters); screen.classList.toggle('show-settings', settings); screen.classList.remove('show-tool');
  chaptersPage.classList.toggle('is-visible', chapters); settingsPage.classList.toggle('is-visible', settings); toolPages.forEach(item => item.classList.remove('is-visible'));
  if (!chapters) bookMenu.hidden = true;
}
function openTool(id) { showPage('作品'); screen.classList.add('show-tool'); document.querySelector(id).classList.add('is-visible'); }
function renderChapters(bookName) {
  const book = books[bookName]; document.querySelector('#currentBook').textContent = bookName; document.querySelector('#chapterCount').textContent = book.count;
  chapterList.innerHTML = book.chapters.map(([number, title, meta]) => `<button class="chapter-row"><span class="chapter-no">${number}</span><span class="chapter-title">${title}</span><span class="chapter-meta">${meta}</span><b>›</b></button>`).join('');
  document.querySelectorAll('.chapter-row').forEach(row => row.addEventListener('click', () => notify('正在打开章节编辑器')));
}
function renderCharacters() { document.querySelector('#characterList').innerHTML = characters.map(item => `<article class="character-item"><h3>${escapeHtml(item.name)}</h3><span>${escapeHtml(item.role)}</span><p>${escapeHtml(item.note || '暂无补充设定')}</p></article>`).join(''); }
function renderTimeline() { document.querySelector('#timelineList').innerHTML = events.map(item => `<article class="timeline-item"><time>${escapeHtml(item.time)}</time><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.note || '暂无补充说明')}</p></article>`).join(''); }
function exportBook(bookName) {
  const book = books[bookName]; return `墨间 · 稿件导出\n\n《${bookName}》\n${book.count}\n\n${book.chapters.map(([number, title, meta]) => `${number}  ${title}\n${meta}\n`).join('\n')}\n提示：章节正文编辑器接入后，导出文件会自动附带全文。\n`;
}
function downloadText(content, filename) { const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }

const isSyncEnabled = localStorage.getItem('mojian-sync') !== 'off';
syncToggle.checked = isSyncEnabled; syncStatus.textContent = isSyncEnabled ? '已开启 · 联网时将自动备份稿件' : '已关闭 · 稿件仅保存在此设备';
syncToggle.addEventListener('change', () => { const enabled = syncToggle.checked; localStorage.setItem('mojian-sync', enabled ? 'on' : 'off'); syncStatus.textContent = enabled ? '已开启 · 联网时将自动备份稿件' : '已关闭 · 稿件仅保存在此设备'; notify(enabled ? '自动同步已开启' : '自动同步已关闭'); });
document.querySelector('#exportButton').addEventListener('click', () => { downloadText(Object.keys(books).map(exportBook).join('\n\n'), '墨间-全部稿件.txt'); notify('已导出全部稿件'); });
document.querySelector('#toolExportButton').addEventListener('click', () => { const book = document.querySelector('#exportBook').value; downloadText(exportBook(book), `墨间-${book}.txt`); notify(`已导出《${book}》`); });
document.querySelector('#exportBook').addEventListener('change', event => { document.querySelector('#exportSummary').textContent = books[event.target.value].count + ' · 将导出章节标题、状态与字数'; });
document.querySelector('#exportSummary').textContent = books['雾港来信'].count + ' · 将导出章节标题、状态与字数';

document.querySelector('#characterForm').addEventListener('submit', event => { event.preventDefault(); const character = { name: document.querySelector('#characterName').value.trim(), role: document.querySelector('#characterRole').value.trim(), note: document.querySelector('#characterNote').value.trim() }; characters.unshift(character); localStorage.setItem('mojian-characters', JSON.stringify(characters)); renderCharacters(); event.target.reset(); notify('角色设定已保存'); });
document.querySelector('#timelineForm').addEventListener('submit', event => { event.preventDefault(); const item = { time: document.querySelector('#eventTime').value.trim(), title: document.querySelector('#eventTitle').value.trim(), note: document.querySelector('#eventNote').value.trim() }; events.push(item); localStorage.setItem('mojian-events', JSON.stringify(events)); renderTimeline(); event.target.reset(); notify('时间线事件已保存'); });
document.querySelectorAll('[data-close-tool]').forEach(button => button.addEventListener('click', () => { showPage('作品'); document.querySelector('.tabbar .active')?.classList.remove('active'); document.querySelector('[data-page="作品"]').classList.add('active'); }));
document.querySelector('#bookSwitch').addEventListener('click', () => { bookMenu.hidden = !bookMenu.hidden; });
document.querySelectorAll('#bookMenu button').forEach(button => button.addEventListener('click', () => { renderChapters(button.dataset.book); bookMenu.hidden = true; notify(`已切换到《${button.dataset.book}》`); }));
document.querySelector('.round-play').addEventListener('click', () => notify('正在打开《雾港来信》第 26 章'));
document.querySelectorAll('.add').forEach(button => button.addEventListener('click', () => notify('正在打开章节编辑器')));
document.querySelectorAll('.tool-card').forEach(button => button.addEventListener('click', () => { const name = button.querySelector('span').textContent; openTool(name === '人物设定' ? '#charactersPage' : name === '故事时间线' ? '#timelinePage' : '#exportPage'); }));
document.querySelectorAll('.tabbar button[data-page]').forEach(button => button.addEventListener('click', () => { document.querySelector('.tabbar .active')?.classList.remove('active'); button.classList.add('active'); const page = button.dataset.page; showPage(page); if (page !== '设置' && page !== '章节') notify(`已切换到${page}`); }));
renderChapters('雾港来信'); renderCharacters(); renderTimeline();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
