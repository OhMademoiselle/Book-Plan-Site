/* Структура вкладки (слева) и выдвижные панели на телефоне. */
const olist = document.getElementById('olist');
const closePanels = () => document.body.classList.remove('show-outline', 'show-insp');

/* Переход к блоку или к карточке внутри блока. */
function jumpTo(id, cardIndex) {
  closePanels();
  go(id);
  if (cardIndex == null) return;
  setTimeout(() => {
    const grid = document.querySelector('[data-id="' + id + '"] .grid');
    const card = grid && grid.children[cardIndex];
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 150);
}

function outlineTitle(b) {
  if (b.t === 'cards') return b.cards.length + ' шт.';
  const s = ttl(b);
  return s || '—';
}

function renderOutline() {
  if (!olist || !S.tabs[S.active]) return;
  olist.replaceChildren();
  const add = (b, depth) => {
    olist.append(
      h(
        'button',
        {
          type: 'button',
          class: 'oi' + (depth ? ' in' : ''),
          style: depth ? 'margin-left:' + depth * 12 + 'px' : '',
          title: lab(b),
          on: { click: () => jumpTo(b.id) }
        },
        h('span', { class: 'ot' }, TN[b.t] || b.t),
        h('span', { class: 'ox' }, b.t === 'group' ? 'Группа блоков' : outlineTitle(b))
      )
    );
    if (b.t === 'group') (b.items || []).forEach(x => add(x, depth + 1));
    if (b.t === 'cards')
      b.cards.forEach((c, i) =>
        olist.append(
          h(
            'button',
            {
              type: 'button',
              class: 'oi sub',
              style: 'margin-left:' + (depth * 12 + 14) + 'px',
              on: { click: () => jumpTo(b.id, i) }
            },
            h('span', { class: 'ox' }, plain(c.a) || 'Без названия')
          )
        )
      );
  };
  const blocks = S.tabs[S.active].blocks;
  if (!blocks.length) olist.append(h('p', { class: 'oe' }, 'Блоков пока нет.'));
  blocks.forEach(b => add(b, 0));
}

/* Названия блоков в структуре обновляются, пока вы печатаете. */
let OL_TIMER = null;
document.getElementById('main').addEventListener('input', () => {
  clearTimeout(OL_TIMER);
  OL_TIMER = setTimeout(renderOutline, 400);
});

/* Выдвижные панели на телефоне: структура слева, свойства снизу. */
const togglePanel = cls => {
  const was = document.body.classList.contains(cls);
  closePanels();
  if (!was) document.body.classList.add(cls);
};
document.getElementById('obtn').onclick = () => togglePanel('show-outline');
document.getElementById('fbtn').onclick = () => togglePanel('show-insp');
document.getElementById('scrim').onclick = closePanels;
document.getElementById('pp').addEventListener('click', e => {
  if (e.target.closest('button')) closePanels();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePanels();
});

/* На телефоне поиск переезжает в выдвижную панель структуры, чтобы шапка была компактной. */
const searchBox = document.querySelector('.sr');
const headerRow = document.querySelector('.hrow');
const narrow = window.matchMedia('(max-width: 1099px)');
const placeSearch = () => {
  if (narrow.matches) document.getElementById('outline').prepend(searchBox);
  else headerRow.insertBefore(searchBox, document.getElementById('hacts'));
};
placeSearch();
if (narrow.addEventListener) narrow.addEventListener('change', placeSearch);

/* Высота шапки нужна боковым панелям, чтобы прилипать сразу под ней. */
const topBar = document.querySelector('header');
const setHeaderHeight = () =>
  document.documentElement.style.setProperty('--hh', topBar.offsetHeight + 'px');
setHeaderHeight();
window.addEventListener('resize', setHeaderHeight);
if (window.ResizeObserver) new ResizeObserver(setHeaderHeight).observe(topBar);
