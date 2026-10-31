/* Безопасная очистка HTML текста: оставляет только разрешённое форматирование. */
/* ссылки на блоки */
const TN = {
  h: 'Заголовок',
  p: 'Текст',
  warn: 'Плашка',
  table: 'Таблица',
  cards: 'Карточки',
  group: 'Группа',
  img: 'Изображение'
};
const OKTAG = new Set([
    'B',
    'I',
    'U',
    'S',
    'STRONG',
    'EM',
    'SPAN',
    'FONT',
    'A',
    'BR',
    'DIV',
    'P',
    'UL',
    'OL',
    'LI',
    'SUB',
    'SUP',
    'STRIKE',
    'DEL'
  ]),
  BADTAG =
    /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|SVG|MATH|FORM|INPUT|TEXTAREA|BUTTON|SELECT|IMG|VIDEO|AUDIO|BASE|TEMPLATE|NOSCRIPT)$/;
const OKT = new Set(['TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'H1', 'H2', 'H3']);
function san(x, tbl) {
  if (!x) return '';
  const d = new DOMParser().parseFromString('<body>' + x, 'text/html').body;
  const walk = n => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 3) continue;
      if (c.nodeType !== 1) {
        c.remove();
        continue;
      }
      if (BADTAG.test(c.tagName)) {
        c.remove();
        continue;
      }
      walk(c);
      if (!OKTAG.has(c.tagName) && !(tbl && OKT.has(c.tagName))) {
        c.replaceWith(...c.childNodes);
        continue;
      }
      for (const a of [...c.attributes]) {
        const nm = a.name.toLowerCase();
        if (nm === 'style') {
          const keep = [
            'color',
            'font-size',
            'font-family',
            'font-weight',
            'font-style',
            'text-decoration',
            'text-decoration-line',
            'text-align'
          ]
            .map(p => [p, c.style.getPropertyValue(p)])
            .filter(
              v =>
                v[1] &&
                !/url\(|expression|javascript|@import/i.test(v[1]) &&
                (v[0] !== 'font-family' || /^[\w\s,"'\-\u0400-\u04FF]{1,120}$/.test(v[1]))
            );
          c.removeAttribute('style');
          keep.forEach(([p, v]) => c.style.setProperty(p, v));
        } else if (nm === 'data-b' && c.tagName === 'A') {
          if (!/^[A-Za-z0-9_-]{3,40}$/.test(a.value)) c.removeAttribute(a.name);
        } else if (c.tagName === 'FONT' && (nm === 'color' || nm === 'size')) {
          if (!/^[#A-Za-z0-9(),. %-]{1,40}$/.test(a.value)) c.removeAttribute(a.name);
        } else c.removeAttribute(a.name);
      }
    }
  };
  walk(d);
  return d.innerHTML;
}
const plain = s => {
  const d = document.createElement('div');
  d.innerHTML = san(s);
  return d.textContent.trim();
};
const lab = b => {
  if (b.t === 'group') return 'Группа: ' + ttl(b.items[0]);
  const s = plain(
    b.t === 'table'
      ? b.rows.slice(0, 2).flat().join(' ')
      : b.t === 'cards'
        ? b.cards.map(c => c.a).join(', ')
        : b.x
  );
  return TN[b.t] + (s ? ': ' + s.slice(0, 40) : '');
};
const ttl = b => lab(b).replace(/^[^:]+: /, '');
