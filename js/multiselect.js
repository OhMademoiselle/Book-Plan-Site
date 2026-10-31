/* Выделение нескольких блоков и объединение их в группу. */
/* объединение выбором блоков */
function startMM() {
  if (S.tabs[S.active].blocks.length < 2) {
    toast('Для объединения нужно хотя бы два блока');
    return;
  }
  MM = [];
  document.body.classList.add('mm');
  renderMM();
}
function endMM() {
  MM = null;
  render();
}
function renderMM() {
  if (!MM) return;
  const n = S.tabs[S.active].blocks.filter(b => MM.includes(b.id)).length;
  document
    .getElementById('mbar')
    .replaceChildren(
      h('span', {}, n ? 'Выбрано блоков: ' + n : 'Кликайте по блокам, чтобы выбрать несколько'),
      h('button', { class: 'go', disabled: n < 2, on: { click: mergeSel } }, 'Объединить'),
      h('button', { on: { click: endMM } }, 'Отмена')
    );
}
function mergeSel() {
  const bl = S.tabs[S.active].blocks;
  const sl = bl.filter(b => MM.includes(b.id));
  if (sl.length < 2) {
    toast('Выберите хотя бы два блока');
    return;
  }
  const idx = bl.indexOf(sl[0]),
    g = sl.find(b => b.t === 'group') || { id: uid(), t: 'group', c: false };
  g.items = sl.flatMap(b => (b.t === 'group' ? b.items : [b]));
  const rest = bl.filter(b => !sl.includes(b));
  rest.splice(idx, 0, g);
  bl.splice(0, bl.length, ...rest);
  MM = null;
  upd();
  toast('Блоки объединены');
}
document.getElementById('main').addEventListener(
  'click',
  ev => {
    if (!MM) return;
    const el = ev.target.closest('.blk.top');
    if (!el) return;
    ev.preventDefault();
    ev.stopPropagation();
    const k = MM.indexOf(el.dataset.id);
    k < 0 ? MM.push(el.dataset.id) : MM.splice(k, 1);
    el.classList.toggle('picked');
    renderMM();
  },
  true
);
let MM = null;
