const toast = document.querySelector('.toast');
const screen = document.querySelector('.screen');
const settingsPage = document.querySelector('.settings-page');
const syncToggle = document.querySelector('#syncToggle');
const syncStatus = document.querySelector('#syncStatus');

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function showSettings(show) {
  screen.classList.toggle('show-settings', show);
  settingsPage.classList.toggle('is-visible', show);
}

const isSyncEnabled = localStorage.getItem('mojian-sync') !== 'off';
syncToggle.checked = isSyncEnabled;
syncStatus.textContent = isSyncEnabled ? '已开启 · 联网时将自动备份稿件' : '已关闭 · 稿件仅保存在此设备';

syncToggle.addEventListener('change', () => {
  const enabled = syncToggle.checked;
  localStorage.setItem('mojian-sync', enabled ? 'on' : 'off');
  syncStatus.textContent = enabled ? '已开启 · 联网时将自动备份稿件' : '已关闭 · 稿件仅保存在此设备';
  notify(enabled ? '自动同步已开启' : '自动同步已关闭');
});

document.querySelector('#exportButton').addEventListener('click', () => {
  const content = '墨间 · 稿件导出\n\n《雾港来信》\n第 26 章 · 潮汐落下之前\n\n此处将导出你实际保存的章节正文。\n';
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = '墨间-全部稿件.txt';
  link.click();
  URL.revokeObjectURL(url);
  notify('已导出 TXT 稿件');
});

document.querySelector('.round-play').addEventListener('click', () => notify('正在打开《雾港来信》第 26 章'));
document.querySelectorAll('.add').forEach(button => button.addEventListener('click', () => notify('正在打开章节编辑器')));
document.querySelectorAll('.tool-card').forEach(button => button.addEventListener('click', () => notify(`${button.querySelector('span').textContent}已打开`)));
document.querySelectorAll('.tabbar button[data-page]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelector('.tabbar .active')?.classList.remove('active');
    button.classList.add('active');
    const page = button.dataset.page;
    showSettings(page === '设置');
    if (page !== '设置') notify(`已切换到${page}`);
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
