/* Карточки: атрибуты (возраст, роль и т. д.) и меню выбора атрибута. */
const ATTR_PRESETS = [
  'Возраст',
  'Роль',
  'Внешность',
  'Характер',
  'Цель',
  'Страх',
  'Слабость',
  'Тайна',
  'Окружение',
  'Место',
  'Дата'
];
let APOP = null;
const APOP_OUT = e => {
  if (APOP && !APOP.contains(e.target)) closeAttrMenu();
};
function closeAttrMenu() {
  if (!APOP) return;
  APOP.remove();
  APOP = null;
  document.removeEventListener('mousedown', APOP_OUT, true);
  window.removeEventListener('scroll', closeAttrMenu, true);
}
const atList = c => (c.at || []).filter(a => a && (plain(a.k) || plain(a.v)));
function addAttr(b, c, ci, name, all) {
  const nm = String(name || '').trim(),
    has = t => (t.at || []).some(a => plain(a.k).toLowerCase() === nm.toLowerCase());
  let added = 0;
  (all ? b.cards : [c]).forEach(t => {
    if (nm && has(t)) return;
    if (!t.at) t.at = [];
    t.at.push({ k: esc(nm), v: '' });
    added++;
  });
  if (!added) {
    toast('Такой атрибут у карточки уже есть');
    return;
  }
  closeAttrMenu();
  upd();
  setTimeout(() => {
    const g = document.querySelector('[data-id="' + b.id + '"] .grid'),
      cd = g && g.children[ci];
    if (!cd) return;
    const rows = [...cd.querySelectorAll('.at')];
    const row =
      (nm &&
        rows.find(
          r => plain(r.querySelector('.ak').innerHTML).toLowerCase() === nm.toLowerCase()
        )) ||
      rows[rows.length - 1];
    const f = row && row.querySelector(nm ? '.av' : '.ak');
    if (f) f.focus();
  }, 40);
}
function attrMenu(btn, b, c, ci) {
  closeAttrMenu();
  const used = new Set((c.at || []).map(a => plain(a.k).toLowerCase())),
    all = h('input', { type: 'checkbox' }),
    inp = h('input', {
      type: 'text',
      maxLength: 40,
      placeholder: 'Свой атрибут, например «Рост»',
      autocomplete: 'off'
    }),
    chips = h('div', { class: 'ch' });
  ATTR_PRESETS.filter(p => !used.has(p.toLowerCase())).forEach(p =>
    chips.append(
      h('button', { type: 'button', on: { click: () => addAttr(b, c, ci, p, all.checked) } }, p)
    )
  );
  const own = () => addAttr(b, c, ci, inp.value, all.checked);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      own();
    }
    if (e.key === 'Escape') closeAttrMenu();
  });
  const pop = h(
    'div',
    { class: 'apop' },
    h('p', {}, 'Выберите атрибут или введите свой'),
    chips,
    h(
      'div',
      { class: 'arow' },
      inp,
      h('button', { type: 'button', class: 'go', on: { click: own } }, 'Добавить')
    ),
    h('label', { class: 'achk' }, all, 'Добавить во все карточки этого блока')
  );
  document.body.append(pop);
  APOP = pop;
  const r = btn.getBoundingClientRect(),
    w = pop.offsetWidth || 310,
    ph = pop.offsetHeight || 240;
  pop.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  pop.style.top =
    (r.bottom + 6 + ph > innerHeight && r.top - ph - 6 > 0 ? r.top - ph - 6 : r.bottom + 6) + 'px';
  document.addEventListener('mousedown', APOP_OUT, true);
  inp.focus({ preventScroll: true });
  setTimeout(() => window.addEventListener('scroll', closeAttrMenu, true), 0);
}
function attrsUI(b, c, ci) {
  const wrap = h('div', { class: 'atw' });
  if (c.at && c.at.length) {
    const list = h('div', { class: 'atl' });
    c.at.forEach((a, i) =>
      list.append(
        h(
          'div',
          { class: 'at' + (!plain(a.k) && !plain(a.v) ? ' ae' : '') },
          ed(a, 'k', 'ak', 'Атрибут'),
          ed(a, 'v', 'av', 'Значение'),
          h(
            'button',
            {
              type: 'button',
              class: 'atx',
              title: 'Убрать атрибут',
              on: {
                click: () => {
                  c.at.splice(i, 1);
                  if (!c.at.length) delete c.at;
                  upd();
                }
              }
            },
            '✕'
          )
        )
      )
    );
    wrap.append(list);
  }
  wrap.append(
    h(
      'div',
      { class: 'atb' },
      h(
        'button',
        {
          type: 'button',
          class: 'add',
          title: 'Добавить к карточке атрибут: возраст, роль, тайна и т. д.',
          on: { click: ev => attrMenu(ev.currentTarget, b, c, ci) }
        },
        '+ Атрибут'
      )
    )
  );
  return wrap;
}
