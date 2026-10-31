/* Поиск по открытой книге. */
/* поиск */
const q = document.getElementById('q'),
  sres = document.getElementById('sres');
const clearQ = () => {
  if (q.value && document.activeElement !== q && /@/.test(q.value)) q.value = '';
};
window.addEventListener('pageshow', clearQ);
setTimeout(clearQ, 300);
setTimeout(clearQ, 1500);
const btxt = b =>
  b.t === 'table'
    ? plain(b.rows.flat().join(' | '))
    : b.t === 'cards'
      ? plain(
          b.cards
            .map(
              c =>
                c.a +
                ' — ' +
                c.b +
                atList(c)
                  .map(a => ' · ' + a.k + ': ' + a.v)
                  .join('')
            )
            .join(' | ')
        )
      : plain(b.x);
function doSearch() {
  const v = q.value.trim().toLowerCase();
  sres.replaceChildren();
  if (!v) {
    sres.classList.remove('on');
    return;
  }
  const out = [],
    add = (ti, id, head, txt) => {
      const k = txt.toLowerCase().indexOf(v);
      if (k >= 0) out.push({ ti, id, head, txt, k });
    };
  S.tabs.forEach((t, ti) => {
    add(ti, null, 'Вкладка', t.name);
    const w = bl =>
      bl.forEach(b => {
        if (b.t === 'group') w(b.items);
        else add(ti, b.id, TN[b.t], btxt(b));
      });
    w(t.blocks);
  });
  if (!out.length) sres.append(h('div', { class: 'empty' }, 'Ничего не найдено'));
  out.slice(0, 40).forEach(r => {
    const a = Math.max(0, r.k - 25),
      pre = (a ? '…' : '') + r.txt.slice(a, r.k),
      mid = r.txt.slice(r.k, r.k + v.length),
      post = r.txt.slice(r.k + v.length, r.k + v.length + 40);
    sres.append(
      h(
        'button',
        {
          class: 'sri',
          on: {
            click: () => {
              sres.classList.remove('on');
              if (r.id) go(r.id);
              else {
                S.active = r.ti;
                upd();
              }
            }
          }
        },
        h('small', {}, r.head + ' · ' + (S.tabs[r.ti].name || 'Без названия')),
        pre,
        h('mark', {}, mid),
        post
      )
    );
  });
  sres.classList.add('on');
}
q.addEventListener('input', doSearch);
q.addEventListener('focus', doSearch);
q.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    q.value = '';
    doSearch();
    q.blur();
  }
});
document.addEventListener('click', e => {
  if (!e.target.closest('.sr')) sres.classList.remove('on');
});
