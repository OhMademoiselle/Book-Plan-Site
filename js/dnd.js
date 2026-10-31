/* Перетаскивание блоков, карточек и автопрокрутка. */
/* перетаскивание блоков и карточек */
let DR = null;
function dnd(el, list, i, horiz, xtra) {
  el.addEventListener('dragover', ev => {
    if (!DR || DR.list !== list || DR.i === i) return;
    ev.preventDefault();
    ev.stopPropagation();
    const r = el.getBoundingClientRect();
    DR.aft = horiz ? ev.clientX > r.left + r.width / 2 : ev.clientY > r.top + r.height / 2;
    el.classList.remove('dr-b', 'dr-a');
    el.classList.add(DR.aft ? 'dr-a' : 'dr-b');
  });
  el.addEventListener('dragleave', ev => {
    if (!el.contains(ev.relatedTarget)) el.classList.remove('dr-b', 'dr-a');
  });
  el.addEventListener('drop', ev => {
    if (!DR || DR.list !== list) return;
    ev.preventDefault();
    ev.stopPropagation();
    const f = DR.i,
      aft = DR.aft;
    DR = null;
    const to = i - (f < i ? 1 : 0) + (aft ? 1 : 0),
      ex = xtra && xtra(),
      [m] = list.splice(f, 1);
    list.splice(to, 0, m);
    if (ex) {
      while (ex.length < list.length) ex.push(0);
      const [mm] = ex.splice(f, 1);
      ex.splice(to, 0, mm);
    }
    upd();
  });
}
function dh(list, i, el) {
  const g = h(
    'span',
    { class: 'dh', draggable: true, title: 'Перетащите, чтобы переставить' },
    '⠿'
  );
  g.addEventListener('dragstart', ev => {
    DR = { list, i };
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('application/x-plan', '1');
    try {
      ev.dataTransfer.setDragImage(el, 16, 16);
    } catch (e) {}
    setTimeout(() => el.classList.add('dragging'), 0);
  });
  g.addEventListener('dragend', () => {
    DR = null;
    document
      .querySelectorAll('.dragging,.dr-b,.dr-a')
      .forEach(x => x.classList.remove('dragging', 'dr-b', 'dr-a'));
  });
  return g;
}
function cdnd(el, b, i, n) {
  el.addEventListener('dragover', ev => {
    if (!DR || DR.list !== b || DR.i === i) return;
    ev.preventDefault();
    ev.stopPropagation();
    const r = el.getBoundingClientRect();
    DR.aft = ev.clientX > r.left + r.width / 2;
    el.parentElement
      .querySelectorAll('th.dr-b,th.dr-a')
      .forEach(x => x.classList.remove('dr-b', 'dr-a'));
    el.classList.add(DR.aft ? 'dr-a' : 'dr-b');
  });
  el.addEventListener('dragleave', ev => {
    if (!el.contains(ev.relatedTarget)) el.classList.remove('dr-b', 'dr-a');
  });
  el.addEventListener('drop', ev => {
    if (!DR || DR.list !== b) return;
    ev.preventDefault();
    ev.stopPropagation();
    const f = DR.i,
      aft = DR.aft;
    DR = null;
    const to = i - (f < i ? 1 : 0) + (aft ? 1 : 0);
    b.rows.forEach(r => {
      const [m] = r.splice(f, 1);
      r.splice(to, 0, m);
    });
    if (b.w && b.w.length === n) {
      const [m] = b.w.splice(f, 1);
      b.w.splice(to, 0, m);
    }
    upd();
  });
}
/* автопрокрутка страницы при перетаскивании: у браузера она почти не работает, и до верхних блоков не добраться */
let DY = null,
  DST = null;
document.addEventListener(
  'dragover',
  ev => {
    DY = ev.clientY;
  },
  true
);
document.addEventListener(
  'dragstart',
  () => {
    setTimeout(() => {
      if (DR || TD !== null) {
        clearInterval(DST);
        DST = setInterval(() => {
          if (DY == null) return;
          const hh = window.innerHeight,
            z = Math.min(130, hh / 4);
          let v = 0;
          if (DY < z) v = -Math.ceil((z - DY) / 6);
          else if (DY > hh - z) v = Math.ceil((DY - (hh - z)) / 6);
          if (v) window.scrollBy(0, v);
        }, 16);
      }
    }, 0);
  },
  true
);
const dragStop = () => {
  clearInterval(DST);
  DST = null;
  DY = null;
};
document.addEventListener('dragend', dragStop, true);
document.addEventListener('drop', dragStop, true);
