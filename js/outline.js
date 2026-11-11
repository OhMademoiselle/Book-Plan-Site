/* Структура вкладки (слева) и панель «Свойства» (справа): сворачивание групп, переименование группы,
   скрытие панелей, ширина панелей мышкой, выдвижные панели на телефоне. */
const olist = document.getElementById('olist');
const rootEl = document.documentElement;
const narrow = window.matchMedia('(max-width: 1099px)');
const isWide = () => !narrow.matches;
const closePanels = () => document.body.classList.remove('show-outline', 'show-insp');

/* ---- раскладка: ширина и скрытие панелей (запоминается на устройстве) ---- */
const LAYOUT_KEY = 'plan-knigi-layout';
const OW_DEF = 240,
  PW_DEF = 300;
const OW_MIN = 180,
  OW_MAX = 520,
  PW_MIN = 240,
  PW_MAX = 560;
const layout = (() => {
  const d = { ow: OW_DEF, pw: PW_DEF, ho: false, hi: false };
  try {
    return Object.assign(d, JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null') || {});
  } catch (e) {
    return d;
  }
})();
const saveLayout = () => {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch (e) {}
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
layout.ow = clamp(+layout.ow || OW_DEF, OW_MIN, OW_MAX);
layout.pw = clamp(+layout.pw || PW_DEF, PW_MIN, PW_MAX);

function applyLayout() {
  rootEl.style.setProperty('--ow', layout.ow + 'px');
  rootEl.style.setProperty('--pw', layout.pw + 'px');
  rootEl.classList.toggle('lo-off', !!layout.ho);
  rootEl.classList.toggle('li-off', !!layout.hi);
  const ob = document.getElementById('obtn'),
    pb = document.getElementById('pbtn');
  if (isWide()) {
    ob.setAttribute('aria-pressed', String(!layout.ho));
    pb.setAttribute('aria-pressed', String(!layout.hi));
  } else {
    ob.removeAttribute('aria-pressed');
    pb.removeAttribute('aria-pressed');
  }
  const ro = document.getElementById('rzo'),
    rp = document.getElementById('rzp');
  ro.setAttribute('aria-valuenow', layout.ow);
  rp.setAttribute('aria-valuenow', layout.pw);
}

function togglePanelDesktop(which) {
  if (which === 'o') layout.ho = !layout.ho;
  else layout.hi = !layout.hi;
  saveLayout();
  applyLayout();
}

/* Ручка на границе панели: тянете мышкой, ширина меняется. Двойной щелчок возвращает прежнюю ширину,
   стрелки на клавиатуре меняют ширину на 16 px. */
function setupResize(handle, which) {
  const min = which === 'o' ? OW_MIN : PW_MIN,
    max = which === 'o' ? OW_MAX : PW_MAX;
  const set = w => {
    const v = clamp(Math.round(w), min, max);
    if (which === 'o') layout.ow = v;
    else layout.pw = v;
    applyLayout();
  };
  let dragging = false;
  handle.addEventListener('pointerdown', e => {
    if (!isWide()) return;
    e.preventDefault();
    dragging = true;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch (x) {}
    handle.classList.add('drag');
    document.body.classList.add('resizing');
  });
  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    set(which === 'o' ? e.clientX : (rootEl.clientWidth || window.innerWidth) - e.clientX);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('drag');
    document.body.classList.remove('resizing');
    saveLayout();
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('dblclick', () => {
    set(which === 'o' ? OW_DEF : PW_DEF);
    saveLayout();
  });
  handle.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    set((which === 'o' ? layout.ow : layout.pw) + (which === 'o' ? dir : -dir) * 16);
    saveLayout();
  });
}
setupResize(document.getElementById('rzo'), 'o');
setupResize(document.getElementById('rzp'), 'i');

/* ---- кнопка слева от заголовка: раскрывает и скрывает весь список блоков ---- */
const otog = document.getElementById('otog');
function applyListState() {
  const off = !!layout.lc;
  olist.hidden = off;
  otog.textContent = off ? '▸' : '▾';
  otog.setAttribute('aria-expanded', String(!off));
  const t = off ? 'Показать список блоков' : 'Скрыть список блоков';
  otog.title = t;
  otog.setAttribute('aria-label', t);
}
otog.onclick = () => {
  layout.lc = !layout.lc;
  saveLayout();
  applyListState();
};
applyListState();

/* ---- структура: сворачивание групп (запоминается на устройстве) ---- */
const FOLD_KEY = 'plan-knigi-olfold';
let OL_FOLD = {};
try {
  OL_FOLD = JSON.parse(localStorage.getItem(FOLD_KEY) || '{}') || {};
} catch (e) {}
const saveFold = () => {
  try {
    localStorage.setItem(FOLD_KEY, JSON.stringify(OL_FOLD));
  } catch (e) {}
};
let GROUP_JUMP = null;

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

/* Переименование группы двойным щелчком по названию. Название хранится в самом блоке (поле n). */
function startRename(b, row) {
  const ox = row.querySelector('.ox');
  if (!ox) return;
  const inp = h('input', {
    type: 'text',
    class: 'orn',
    maxLength: 60,
    value: b.n || '',
    placeholder: 'Название группы',
    'aria-label': 'Название группы'
  });
  ox.replaceWith(inp);
  inp.focus();
  inp.select();
  let done = false;
  const finish = save => {
    if (done) return;
    done = true;
    if (save) {
      const v = inp.value.trim().slice(0, 60);
      if ((b.n || '') !== v) {
        if (v) b.n = v;
        else delete b.n;
        commit();
      }
    }
    renderOutline();
  };
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });
  inp.addEventListener('blur', () => finish(true));
  inp.addEventListener('click', e => e.stopPropagation());
}

function renderOutline() {
  if (!olist || !S.tabs[S.active]) return;
  olist.replaceChildren();
  const indent = depth => (depth ? 'margin-left:' + depth * 12 + 'px' : '');
  const add = (b, depth) => {
    if (b.t === 'group') {
      const folded = !!OL_FOLD[b.id],
        items = b.items || [];
      const row = h(
        'div',
        { class: 'orow', style: indent(depth) },
        h(
          'button',
          {
            type: 'button',
            class: 'ofold',
            title: folded ? 'Развернуть группу' : 'Свернуть группу',
            'aria-label': folded ? 'Развернуть группу' : 'Свернуть группу',
            'aria-expanded': String(!folded),
            on: {
              click: () => {
                if (folded) delete OL_FOLD[b.id];
                else OL_FOLD[b.id] = 1;
                saveFold();
                renderOutline();
              }
            }
          },
          folded ? '▸' : '▾'
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'oi og',
            title: 'Двойной щелчок — переименовать группу',
            on: {
              click: () => {
                clearTimeout(GROUP_JUMP);
                GROUP_JUMP = setTimeout(() => jumpTo(b.id), 220);
              },
              dblclick: () => {
                clearTimeout(GROUP_JUMP);
                startRename(b, row);
              }
            }
          },
          h('span', { class: 'ot' }, 'Группа · ' + items.length),
          h('span', { class: 'ox' }, b.n || 'Группа блоков')
        )
      );
      olist.append(row);
      if (!folded) items.forEach(x => add(x, depth + 1));
      return;
    }
    olist.append(
      h(
        'button',
        {
          type: 'button',
          class: 'oi' + (depth ? ' in' : ''),
          style: indent(depth),
          title: lab(b),
          on: { click: () => jumpTo(b.id) }
        },
        h('span', { class: 'ot' }, TN[b.t] || b.t),
        h('span', { class: 'ox' }, outlineTitle(b))
      )
    );
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

/* ---- кнопки: на компьютере панели скрываются и показываются, на телефоне выезжают ---- */
const togglePanel = cls => {
  const was = document.body.classList.contains(cls);
  closePanels();
  if (!was) document.body.classList.add(cls);
};
document.getElementById('obtn').onclick = () =>
  isWide() ? togglePanelDesktop('o') : togglePanel('show-outline');
document.getElementById('pbtn').onclick = () => togglePanelDesktop('i');
document.getElementById('fbtn').onclick = () => togglePanel('show-insp');
document.querySelectorAll('.pcl').forEach(b => {
  b.onclick = () => {
    if (isWide()) togglePanelDesktop(b.dataset.p === 'outline' ? 'o' : 'i');
    else closePanels();
  };
});
document.getElementById('scrim').onclick = closePanels;
document.getElementById('pp').addEventListener('click', e => {
  if (e.target.closest('button')) closePanels();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePanels();
});

/* На телефоне поиск переезжает в выдвижную панель структуры, чтобы шапка была компактной. */
const searchBox = document.querySelector('.sr');
const headerRow = document.querySelector('.htop');
const placeSearch = () => {
  if (narrow.matches) document.getElementById('outline').prepend(searchBox);
  else headerRow.insertBefore(searchBox, document.getElementById('hacts'));
  applyLayout();
};
applyLayout();
placeSearch();
if (narrow.addEventListener) narrow.addEventListener('change', placeSearch);

/* Высота шапки нужна боковым панелям, чтобы прилипать сразу под ней. */
const topBar = document.querySelector('header');
const setHeaderHeight = () =>
  document.documentElement.style.setProperty('--hh', topBar.offsetHeight + 'px');
setHeaderHeight();
window.addEventListener('resize', setHeaderHeight);
if (window.ResizeObserver) new ResizeObserver(setHeaderHeight).observe(topBar);
