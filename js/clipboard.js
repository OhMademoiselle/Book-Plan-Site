/* Копирование и вставка текста с сохранением форматирования. */
/* копирование и вставка с сохранением форматирования (жирный, курсив, цвет, размер, списки) */
const rgbOf = c => {
  c = String(c || '').trim();
  let m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c);
  if (m) return [+m[1], +m[2], +m[3]];
  m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) {
    const n = parseInt(m[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) {
    const t = m[1];
    return [17 * parseInt(t[0], 16), 17 * parseInt(t[1], 16), 17 * parseInt(t[2], 16)];
  }
  return null;
};
function pasteClean(html) {
  const d = new DOMParser().parseFromString(html, 'text/html').body;
  d.querySelectorAll('script,style,meta,link,title,head,img,svg').forEach(x => x.remove());
  d.querySelectorAll('b,strong').forEach(x => {
    const w = (x.style.fontWeight || '').toLowerCase();
    if (w === 'normal' || w === '400') x.replaceWith(...x.childNodes);
  });
  d.querySelectorAll('[style]').forEach(x => {
    const c = x.style.color;
    if (c) {
      const m = rgbOf(c);
      if (
        /^(black|white|windowtext|canvastext|inherit|initial|currentcolor|unset)$/i.test(
          c.trim()
        ) ||
        (m && Math.max(...m) - Math.min(...m) < 40)
      )
        x.style.removeProperty('color');
    }
    if (x.style.fontFamily && !FONTS.some(f => f[1] && fam1(f[1]) === fam1(x.style.fontFamily)))
      x.style.removeProperty('font-family');
    if (
      /^(16px|12pt|medium|1em|100%|inherit|initial|unset)$/i.test((x.style.fontSize || '').trim())
    )
      x.style.removeProperty('font-size');
  });
  [...d.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,blockquote,pre,tr')]
    .reverse()
    .forEach(x => x.replaceWith(...x.childNodes, document.createElement('br')));
  let out = san(d.innerHTML)
    .replace(/^(\s|<br\s*\/?>)+/i, '')
    .replace(/(\s|<br\s*\/?>)+$/i, '')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
  return out;
}
function selHTML(e) {
  const sel = getSelection();
  if (!sel.rangeCount) return '';
  const r = sel.getRangeAt(0);
  let f = r.cloneContents(),
    n = r.commonAncestorContainer;
  if (n.nodeType === 3) n = n.parentNode;
  while (n && n !== e && n.nodeType === 1) {
    const w = n.cloneNode(false);
    w.append(f);
    f = document.createDocumentFragment();
    f.append(w);
    n = n.parentNode;
  }
  const t = document.createElement('div');
  t.append(f);
  return t.innerHTML;
}
function copyRich(ev, e, cut) {
  const sel = getSelection();
  if (!sel.rangeCount || sel.isCollapsed || !ev.clipboardData) return;
  const html = selHTML(e);
  if (!html) return;
  ev.clipboardData.setData('text/html', html);
  ev.clipboardData.setData('text/plain', sel.toString());
  ev.preventDefault();
  if (cut && e.isContentEditable) document.execCommand('delete');
}
function pasteRich(ev) {
  ev.preventDefault();
  const cd = ev.clipboardData;
  if (!cd) return;
  const html = cd.getData('text/html'),
    txt = cd.getData('text/plain');
  if (html) {
    const c = pasteClean(html);
    if (c.replace(/<[^>]*>/g, '').trim()) {
      document.execCommand('insertHTML', false, c);
      return;
    }
  }
  document.execCommand('insertText', false, txt);
}
