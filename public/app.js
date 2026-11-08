const data = JSON.parse(document.getElementById('page-data').textContent);
const root = document.documentElement;
const preference = matchMedia('(prefers-color-scheme: dark)');
const themeToggle = document.querySelector('[data-theme-toggle]');
const currentTheme = () => root.dataset.theme || (preference.matches ? 'dark' : 'light');
const dialog = document.querySelector('[data-gallery-dialog]');
const image = dialog.querySelector('[data-gallery-image]');
const gallery = [...new Set([...document.querySelectorAll('[data-gallery]')].map(a => a.dataset.gallery))];
let activeImage = 0;
let opener;
const assetFor = id => data.assets.find(asset => asset.id === `${id}-${currentTheme()}`);

function updateImage() {
  const asset = assetFor(gallery[activeImage]);
  image.src = asset.src;
  image.alt = asset.alt;
  image.width = asset.width;
  image.height = asset.height;
  dialog.querySelector('[data-gallery-caption]').textContent = asset.caption;
  dialog.querySelector('[data-gallery-counter]').textContent = `${activeImage + 1} ${data.imageCount} ${gallery.length}`;
}
function applyTheme() {
  const theme = currentTheme();
  themeToggle.setAttribute('aria-label', theme === 'dark' ? themeToggle.dataset.lightLabel : themeToggle.dataset.darkLabel);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0d1719' : '#f7faf8';
  document.querySelectorAll('[data-themed-picture]').forEach(picture => {
    const source = picture.querySelector('source');
    const img = picture.querySelector('img');
    source.srcset = source.dataset[theme];
    img.src = img.dataset[theme];
  });
  document.querySelectorAll('[data-gallery]').forEach(link => { link.href = assetFor(link.dataset.gallery).src; });
  if (dialog.open) updateImage();
}
themeToggle.hidden = false;
themeToggle.addEventListener('click', () => {
  root.dataset.theme = currentTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('gitline-theme', root.dataset.theme); } catch { /* Theme works for this page. */ }
  applyTheme();
});
preference.addEventListener('change', applyTheme);
applyTheme();

const languageLink = document.querySelector('[data-language]');
const updateLanguage = () => {
  const target = new URL(languageLink.href);
  target.hash = location.hash;
  languageLink.href = target.href;
};
updateLanguage();
addEventListener('hashchange', updateLanguage);

document.querySelectorAll('[data-copy]').forEach(button => {
  button.hidden = false;
  let timer;
  button.addEventListener('click', async () => {
    const code = document.getElementById(button.dataset.copy);
    const status = document.querySelector('[data-copy-status]');
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = data.copied;
      status.textContent = data.copied;
      clearTimeout(timer);
      timer = setTimeout(() => { button.textContent = data.copy; status.textContent = ''; }, 2200);
    } catch {
      const selection = getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = data.copyError;
    }
  });
});

if (typeof dialog.showModal === 'function') {
  document.querySelectorAll('[data-gallery]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    activeImage = gallery.indexOf(link.dataset.gallery);
    updateImage();
    dialog.showModal();
    dialog.querySelector('[data-gallery-close]').focus();
  }));
  const move = direction => { activeImage = (activeImage + direction + gallery.length) % gallery.length; updateImage(); };
  dialog.querySelector('[data-gallery-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-gallery-prev]').addEventListener('click', () => move(-1));
  dialog.querySelector('[data-gallery-next]').addEventListener('click', () => move(1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll('button')];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
}
