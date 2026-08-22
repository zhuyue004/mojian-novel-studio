const toast = document.querySelector('.toast');

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

document.querySelector('.round-play').addEventListener('click', () => notify('正在打开《雾港来信》第 26 章'));
document.querySelectorAll('.add').forEach(button => {
  button.addEventListener('click', () => notify('正在打开章节编辑器'));
});
document.querySelectorAll('.tool-card').forEach(button => {
  button.addEventListener('click', () => notify(`${button.querySelector('span').textContent}已打开`));
});
document.querySelectorAll('.tabbar button[data-page]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelector('.tabbar .active')?.classList.remove('active');
    button.classList.add('active');
    notify(button.dataset.page === '写作' ? '新建章节：从这里开始写作' : `已切换到${button.dataset.page}`);
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
