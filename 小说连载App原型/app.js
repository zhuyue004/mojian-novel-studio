const toast = document.querySelector('.toast');
const screen = document.querySelector('.screen');
const settingsPage = document.querySelector('.settings-page');
const chaptersPage = document.querySelector('.chapters-page');
const syncToggle = document.querySelector('#syncToggle');
const syncStatus = document.querySelector('#syncStatus');
const bookMenu = document.querySelector('#bookMenu');
const chapterList = document.querySelector('.chapter-list');

const books = {
  '雾港来信': { count: '共 26 章 · 48,620 字', chapters: [['第 26 章', '潮汐落下之前', '草稿 · 1,826 字'], ['第 25 章', '留在雾里的灯塔', '已完成 · 2,115 字'], ['第 24 章', '海鸥没有回答', '已完成 · 1,972 字'], ['第 23 章', '日落以后', '已完成 · 2,304 字'], ['第 22 章', '失而复得的车票', '已完成 · 1,885 字']] },
  '夏日来信': { count: '共 12 章 · 19,204 字', chapters: [['第 12 章', '一封未寄出的信', '草稿 · 1,204 字'], ['第 11 章', '栀子花开时', '已完成 · 1,876 字'], ['第 10 章', '雨天的电台', '已完成 · 1,642 字']] },
  '北方的白鲸': { count: '共 8 章 · 16,370 字', chapters: [['第 8 章', '雪落无声', '已完成 · 2,370 字'], ['第 7 章', '越过结冰的河', '已完成 · 2,088 字'], ['第 6 章', '白鲸的歌声', '已完成 · 1,907 字']] }
};

function notify(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }
function showPage(page) {
  const chapters = page === '章节';
  const settings = page === '设置';
  screen.classList.toggle('show-chapters', chapters);
  screen.classList.toggle('show-settings', settings);
  chaptersPage.classList.toggle('is-visible', chapters);
  settingsPage.classList.toggle('is-visible', settings);
  if (!chapters) bookMenu.hidden = true;
}
function renderChapters(bookName) {
  const book = books[bookName];
  document.querySelector('#currentBook').textContent = bookName;
  document.querySelector('#chapterCount').textContent = book.count;
  chapterList.innerHTML = book.chapters.map(([number, title, meta]) => `<button class="chapter-row"><span class="chapter-no">${number}</span><span class="chapter-title">${title}</span><span class="chapter-meta">${meta}</span><b>›</b></button>`).join('');
  document.querySelectorAll('.chapter-row').forEach(row => row.addEventListener('click', () => notify('正在打开章节编辑器')));
}

const isSyncEnabled = localStorage.getItem('mojian-sync') !== 'off';
syncToggle.checked = isSyncEnabled;
syncStatus.textContent = isSyncEnabled ? '已开启 · 联网时将自动备份稿件' : '已关闭 · 稿件仅保存在此设备';
syncToggle.addEventListener('change', () => { const enabled = syncToggle.checked; localStorage.setItem('mojian-sync', enabled ? 'on' : 'off'); syncStatus.textContent = enabled ? '已开启 · 联网时将自动备份稿件' : '已关闭 · 稿件仅保存在此设备'; notify(enabled ? '自动同步已开启' : '自动同步已关闭'); });

document.querySelector('#bookSwitch').addEventListener('click', () => { bookMenu.hidden = !bookMenu.hidden; });
document.querySelectorAll('#bookMenu button').forEach(button => button.addEventListener('click', () => { renderChapters(button.dataset.book); bookMenu.hidden = true; notify(`已切换到《${button.dataset.book}》`); }));
document.querySelector('#exportButton').addEventListener('click', () => { const content = '墨间 · 稿件导出\n\n《雾港来信》\n第 26 章 · 潮汐落下之前\n\n此处将导出你实际保存的章节正文。\n'; const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = '墨间-全部稿件.txt'; link.click(); URL.revokeObjectURL(url); notify('已导出 TXT 稿件'); });
document.querySelector('.round-play').addEventListener('click', () => notify('正在打开《雾港来信》第 26 章'));
document.querySelectorAll('.add').forEach(button => button.addEventListener('click', () => notify('正在打开章节编辑器')));
document.querySelectorAll('.tool-card').forEach(button => button.addEventListener('click', () => notify(`${button.querySelector('span').textContent}已打开`)));
document.querySelectorAll('.tabbar button[data-page]').forEach(button => button.addEventListener('click', () => { document.querySelector('.tabbar .active')?.classList.remove('active'); button.classList.add('active'); const page = button.dataset.page; showPage(page); if (page !== '设置' && page !== '章节') notify(`已切换到${page}`); }));
renderChapters('雾港来信');
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
