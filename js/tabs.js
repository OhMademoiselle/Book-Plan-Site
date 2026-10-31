/* Вкладки: переименование и перестановка перетаскиванием. */
/* вкладки: переименование и перетаскивание */
let TD = null,
  TA = false;
function rename(b, tb) {
  const inp = h('input', { class: 'tab on', value: tb.name, maxLength: 30 });
  inp.size = Math.max(4, tb.name.length + 1);
  b.replaceWith(inp);
  inp.focus();
  inp.select();
  let fin = false;
  const done = () => {
    if (fin) return;
    fin = true;
    tb.name = inp.value.trim() || 'Без названия';
    upd();
  };
  inp.addEventListener('blur', done);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') inp.blur();
    if (e.key === 'Escape') {
      inp.value = tb.name;
      inp.blur();
    }
  });
}
function tabDnd(b, i) {
  b.addEventListener('dragstart', ev => {
    TD = i;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('application/x-plan-tab', '1');
  });
  b.addEventListener('dragover', ev => {
    if (TD === null || TD === i) return;
    ev.preventDefault();
    const r = b.getBoundingClientRect();
    TA = ev.clientX > r.left + r.width / 2;
    b.classList.remove('dr-b', 'dr-a');
    b.classList.add(TA ? 'dr-a' : 'dr-b');
  });
  b.addEventListener('dragleave', () => b.classList.remove('dr-b', 'dr-a'));
  b.addEventListener('drop', ev => {
    if (TD === null) return;
    ev.preventDefault();
    const f = TD,
      aft = TA;
    TD = null;
    const act = S.tabs[S.active],
      to = i - (f < i ? 1 : 0) + (aft ? 1 : 0),
      [m] = S.tabs.splice(f, 1);
    S.tabs.splice(to, 0, m);
    S.active = S.tabs.indexOf(act);
    upd();
  });
  b.addEventListener('dragend', () => {
    TD = null;
    document
      .querySelectorAll('.tab.dr-b,.tab.dr-a')
      .forEach(x => x.classList.remove('dr-b', 'dr-a'));
  });
}
