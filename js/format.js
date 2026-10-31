/* Форматирование текста: жирный, курсив, цвет, размер, шрифт, список шрифтов. */
try {
  document.execCommand('defaultParagraphSeparator', false, 'br');
} catch (e) {}
let PSZ = '',
  PEND = null;
/* размер, выбранный до набора текста: браузер создаёт <font size=7>, превращаем его в span с нужным размером и возвращаем курсор внутрь */
function fixSize(e) {
  const fs = e.querySelectorAll('font[size="7"]');
  if (!fs.length) return;
  const g = getSelection(),
    an = g.anchorNode,
    ao = g.anchorOffset,
    had = g.rangeCount && g.isCollapsed;
  fs.forEach(f => {
    const n = document.createElement('span');
    if (PSZ) n.style.fontSize = PSZ;
    n.append(...f.childNodes);
    f.replaceWith(n);
  });
  if (had && an && e.contains(an)) {
    try {
      g.collapse(an, ao);
    } catch (x) {}
  }
}
const FONTS = [
  ['По умолчанию', ''],
  ['Системный', 'system-ui, sans-serif'],
  ['Arial', 'Arial, Helvetica, sans-serif'],
  ['Verdana', 'Verdana, Geneva, sans-serif'],
  ['Trebuchet MS', '"Trebuchet MS", sans-serif'],
  ['Georgia', 'Georgia, serif'],
  ['Times New Roman', '"Times New Roman", Times, serif'],
  ['Palatino', '"Palatino Linotype", Palatino, serif'],
  ['Garamond', 'Garamond, "Times New Roman", serif'],
  ['Courier New', '"Courier New", Courier, monospace'],
  ['Comic Sans', '"Comic Sans MS", "Comic Neue", cursive'],
  ['Рукописный', '"Segoe Script", "Bradley Hand", cursive']
];
const fam1 = f =>
  String(f || '')
    .split(',')[0]
    .replace(/["']/g, '')
    .trim()
    .toLowerCase();
/* форматирование текста */
const curEd = () => {
  const s = getSelection();
  if (!s.rangeCount) return null;
  let n = s.anchorNode;
  n = n && (n.nodeType === 1 ? n : n.parentElement);
  const e = n && n.closest('.ed');
  return e && e.isContentEditable ? e : null;
};
const fire = e => e.dispatchEvent(new Event('input', { bubbles: true }));
function adaptColors(e) {
  e.querySelectorAll('[style*="color"]').forEach(x => {
    const st = x.getAttribute('style') || '';
    if (/(?<![-\w])color:\s*rgb\(\s*255\s*,\s*255\s*,\s*254\s*\)/i.test(st))
      x.setAttribute('style', st.replace(/(?<![-\w])color:\s*[^;]+/i, 'color: var(--tx)'));
  });
}
function fmt(cmd, val) {
  const e = curEd();
  if (!e) {
    toast('Сначала выделите текст внутри блока');
    return;
  }
  if (cmd === 'foreColor' && val !== 'ADAPT') {
    const m = /^#([0-9a-f]{6})$/i.exec(val);
    if (m) {
      const n = parseInt(m[1], 16),
        L = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      if (L > 0.93 || L < 0.07) {
        val = 'ADAPT';
        toast('Чёрный и белый заменены на основной цвет темы, чтобы текст не сливался с фоном');
      }
    }
  }
  document.execCommand('styleWithCSS', false, true);
  document.execCommand(cmd, false, val === 'ADAPT' ? '#fffffe' : val);
  if (cmd === 'foreColor' && val === 'ADAPT') adaptColors(e);
  fire(e);
}
function size(px) {
  const e = curEd();
  if (!e) {
    toast('Сначала поставьте курсор внутрь блока');
    return;
  }
  const g = getSelection(),
    col = g.isCollapsed;
  PSZ = px;
  document.execCommand('styleWithCSS', false, false);
  document.execCommand('fontSize', false, '7');
  if (col) {
    PEND = { n: g.anchorNode, o: g.anchorOffset };
    return;
  }
  PEND = null;
  e.querySelectorAll('font[size="7"],span[style*="xxx-large"]').forEach(f => {
    const n = document.createElement('span');
    n.style.fontSize = px;
    n.append(...f.childNodes);
    f.replaceWith(n);
  });
  fire(e);
}
function unlink() {
  const e = curEd();
  if (!e) {
    toast('Поставьте курсор внутрь ссылки');
    return;
  }
  let n = getSelection().anchorNode;
  n = n.nodeType === 1 ? n : n.parentElement;
  const l = n.closest('a[data-b]');
  if (!l) {
    toast('Поставьте курсор внутрь ссылки');
    return;
  }
  l.replaceWith(...l.childNodes);
  fire(e);
}
