/* Панель «Настройки текста» и кнопки отмены/возврата. */
const fm = document.getElementById('fp');
const fw = document.getElementById('fmt'),
  ft = document.getElementById('ftog');
fw.addEventListener('mousedown', e => {
  if (e.target.type !== 'color' && e.target.type !== 'number') e.preventDefault();
});
const applyFmt = () => {
  fw.classList.toggle('open', !!S.fmtOpen);
  ft.textContent = 'Aa Настройки текста ' + (S.fmtOpen ? '▴' : '▾');
};
ft.onclick = () => {
  S.fmtOpen = !S.fmtOpen;
  save();
  applyFmt();
};
applyFmt();
const FB = (l, t, f) => fm.append(h('button', { title: t, on: { click: f } }, l));
FB(h('b', {}, 'Ж'), 'Жирный', () => fmt('bold'));
FB(h('i', {}, 'К'), 'Курсив', () => fmt('italic'));
FB(h('u', {}, 'Ч'), 'Подчёркнутый', () => fmt('underline'));
FB(h('s', {}, 'З'), 'Зачёркнутый', () => fmt('strikeThrough'));
fm.append(h('span', { class: 'sp' }));
let lastSel = null;
const withSel = fn => {
  if (!lastSel) {
    toast('Сначала выделите текст внутри блока');
    return;
  }
  const { e, r } = lastSel;
  e.focus();
  const g = getSelection();
  g.removeAllRanges();
  g.addRange(r);
  fn(e);
};
const closeDD = () =>
  document.querySelectorAll('#fmt .dd.open').forEach(x => x.classList.remove('open'));
document.addEventListener('mousedown', e => {
  if (!e.target.closest || !e.target.closest('.dd')) closeDD();
});
const toggleDD = d => {
  const o = d.classList.contains('open');
  closeDD();
  if (!o) d.classList.add('open');
};
/* шрифт */
function clearFont(e) {
  const g = getSelection();
  if (!g.rangeCount) return;
  const r = g.getRangeAt(0);
  e.querySelectorAll('[style*="font-family"],font[face]').forEach(x => {
    if (!r.intersectsNode(x)) return;
    x.style.removeProperty('font-family');
    x.removeAttribute('face');
    if (x.tagName === 'SPAN' && !x.getAttribute('style')) x.replaceWith(...x.childNodes);
    else if (!x.getAttribute('style')) x.removeAttribute('style');
  });
  fire(e);
}
const applyFont = st =>
  withSel(e => {
    if (st) fmt('fontName', st);
    else clearFont(e);
  });
const fontLbl = h('span', {}, 'По умолчанию'),
  fontMenu = h('div', { class: 'ddm' });
const fontDD = h(
  'span',
  { class: 'dd' },
  h(
    'button',
    {
      type: 'button',
      class: 'ddb f',
      title: 'Шрифт выделенного текста (показывается тот шрифт, что есть на вашем устройстве)',
      on: { click: () => toggleDD(fontDD) }
    },
    fontLbl,
    h('span', {}, '▾')
  ),
  fontMenu
);
FONTS.forEach(([n, st]) =>
  fontMenu.append(
    h(
      'button',
      {
        type: 'button',
        'data-f': n,
        style: st ? 'font-family:' + st : '',
        on: {
          click: () => {
            closeDD();
            applyFont(st);
          }
        }
      },
      n
    )
  )
);
/* размер: − [число] + и список готовых размеров */
const szIn = h('input', {
  type: 'number',
  class: 'szin',
  min: 6,
  max: 120,
  step: 1,
  placeholder: 'пт',
  title:
    'Размер в пунктах (6–120). Можно выбрать до набора текста или для выделенного. Введите число и нажмите Enter'
});
const applySize = () => {
  const v = parseFloat(szIn.value);
  if (!(v >= 6 && v <= 120)) {
    toast('Введите размер от 6 до 120 пт');
    return;
  }
  withSel(() => size(v + 'pt'));
};
const bump = d => {
  const v = parseFloat(szIn.value) || 12;
  szIn.value = Math.min(120, Math.max(6, Math.round(v + d)));
  applySize();
};
szIn.addEventListener('keydown', ev => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    applySize();
  }
});
const szMenu = h('div', { class: 'ddm' });
[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].forEach(pt =>
  szMenu.append(
    h(
      'button',
      {
        type: 'button',
        'data-s': pt,
        on: {
          click: () => {
            closeDD();
            szIn.value = pt;
            applySize();
          }
        }
      },
      pt + ' пт'
    )
  )
);
const szDD = h(
  'span',
  { class: 'dd' },
  h(
    'button',
    { type: 'button', class: 'ddb', title: 'Готовые размеры', on: { click: () => toggleDD(szDD) } },
    '▾'
  ),
  szMenu
);
fm.append(
  fontDD,
  h(
    'span',
    { class: 'szrow' },
    h(
      'span',
      { class: 'stepper' },
      h('button', { type: 'button', title: 'Меньше', on: { click: () => bump(-1) } }, '−'),
      szIn,
      h('button', { type: 'button', title: 'Больше', on: { click: () => bump(1) } }, '+')
    ),
    szDD,
    h('span', { class: 'lbl' }, 'пт')
  )
);
/* показывать шрифт и размер текста под курсором */
const syncFmt = () => {
  const e = curEd();
  if (!e || document.activeElement === szIn) return;
  const gs = getSelection();
  if (PEND && gs.isCollapsed && gs.anchorNode === PEND.n && gs.anchorOffset === PEND.o) return;
  let n = gs.anchorNode;
  n = n && (n.nodeType === 1 ? n : n.parentElement);
  if (!n) return;
  try {
    const cs = getComputedStyle(n),
      pt = Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2;
    if (pt > 0) szIn.value = pt;
    const f = fam1(cs.fontFamily),
      m = FONTS.find(x => x[1] && fam1(x[1]) === f);
    fontLbl.textContent = m ? m[0] : 'По умолчанию';
    fontMenu
      .querySelectorAll('button')
      .forEach(b => b.classList.toggle('on', b.dataset.f === fontLbl.textContent));
  } catch (x) {}
};
fm.append(h('span', { class: 'sp' }));
FB(
  h('span', {
    innerHTML:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><circle cx="3" cy="4" r="1.7"/><circle cx="3" cy="9" r="1.7"/><circle cx="3" cy="14" r="1.7"/><rect x="7" y="3" width="10" height="2" rx="1"/><rect x="7" y="8" width="10" height="2" rx="1"/><rect x="7" y="13" width="10" height="2" rx="1"/></svg>'
  }),
  'Маркированный список',
  () => fmt('insertUnorderedList')
);
FB(
  h('span', {
    innerHTML:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><g font-family="sans-serif" font-size="6.5" font-weight="700"><text x="0" y="6">1</text><text x="0" y="11">2</text><text x="0" y="16">3</text></g><rect x="7" y="3" width="10" height="2" rx="1"/><rect x="7" y="8" width="10" height="2" rx="1"/><rect x="7" y="13" width="10" height="2" rx="1"/></svg>'
  }),
  'Нумерованный список',
  () => fmt('insertOrderedList')
);
fm.append(h('span', { class: 'sp' }));
FB(
  h('span', {
    innerHTML:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="1" y="3" width="16" height="2" rx="1"/><rect x="1" y="8" width="10" height="2" rx="1"/><rect x="1" y="13" width="14" height="2" rx="1"/></svg>'
  }),
  'По левому краю',
  () => fmt('justifyLeft')
);
FB(
  h('span', {
    innerHTML:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="1" y="3" width="16" height="2" rx="1"/><rect x="4" y="8" width="10" height="2" rx="1"/><rect x="2" y="13" width="14" height="2" rx="1"/></svg>'
  }),
  'По центру',
  () => fmt('justifyCenter')
);
FB(
  h('span', {
    innerHTML:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="1" y="3" width="16" height="2" rx="1"/><rect x="7" y="8" width="10" height="2" rx="1"/><rect x="3" y="13" width="14" height="2" rx="1"/></svg>'
  }),
  'По правому краю',
  () => fmt('justifyRight')
);
fm.append(h('span', { class: 'sp' }));
document.addEventListener('selectionchange', () => {
  const e = curEd();
  if (e) {
    lastSel = { e, r: getSelection().getRangeAt(0).cloneRange() };
    syncFmt();
  }
});
const applyColor = col => {
  if (!lastSel) {
    toast('Сначала выделите текст внутри блока');
    return;
  }
  const { e, r } = lastSel;
  e.focus();
  const g = getSelection();
  g.removeAllRanges();
  g.addRange(r);
  fmt('foreColor', col);
};
const cr = h('div', { class: 'crow' }, h('span', { class: 'lbl' }, 'Цвет текста:'));
fm.append(cr);
cr.append(
  h('button', {
    class: 'sw',
    title: 'Основной цвет темы: чёрный в светлой теме, белый в тёмной',
    style: 'background:linear-gradient(135deg,#fff 50%,#111 50%)',
    on: { click: () => applyColor('ADAPT') }
  })
);
['#e5484d', '#f08a24', '#d4a017', '#2fa84f', '#3b82f6', '#8b5cf6', '#e255a1'].forEach(col =>
  cr.append(
    h('button', {
      class: 'sw',
      title: 'Цвет текста',
      style: 'background:' + col,
      on: { click: () => applyColor(col) }
    })
  )
);
const cc = h('input', {
  type: 'color',
  value: '#8b5cf6',
  class: 'cpick',
  title: 'Любой оттенок: выберите цвет'
});
cc.addEventListener('change', () => applyColor(cc.value));
cr.append(
  cc,
  h('span', { class: 'lbl' }, 'любой оттенок'),
  h(
    'button',
    {
      title: 'Убрать форматирование у выделенного текста',
      style: 'margin-left:auto',
      on: { click: () => fmt('removeFormat') }
    },
    'Сброс'
  )
);
const TB = (l, t, f) =>
  fw.insertBefore(
    h('button', { type: 'button', title: t, on: { click: f } }, l),
    document.getElementById('fp')
  );
const lk = TB('🔗 Ссылка на блок', 'Сделать ссылку на другой блок', () => {
  if (inLink()) unlink();
  else openPicker();
  updLink();
});
TB('⛓ Объединить блоки', 'Выбрать несколько блоков и объединить их в группу', startMM);
const inLink = () => {
  if (!curEd()) return false;
  let n = getSelection().anchorNode;
  n = n && (n.nodeType === 1 ? n : n.parentElement);
  return !!(n && n.closest && n.closest('a[data-b]'));
};
const updLink = () => {
  const on = inLink();
  lk.textContent = on ? 'Убрать ссылку' : '🔗 Ссылка на блок';
  lk.title = on ? 'Убрать ссылку с этого текста' : 'Сделать ссылку на другой блок';
};
document.addEventListener('selectionchange', updLink);
TB('🗑 Очистить вкладку', 'Удалить все блоки на этой вкладке (с подтверждением)', () => clearTab());
const bu = TB('↶', 'Отменить действие (Ctrl+Z)', () => undo()),
  bd = TB('↷', 'Вернуть действие (Ctrl+Shift+Z)', () => redo());
bu.style.marginLeft = 'auto';
bu.style.fontSize = bd.style.fontSize = '18px';
document.addEventListener('keydown', ev => {
  if (!S.edit || !(ev.ctrlKey || ev.metaKey) || ev.target.tagName === 'INPUT') return;
  if (ev.code === 'KeyZ' && !ev.shiftKey) {
    ev.preventDefault();
    undo();
  } else if (ev.code === 'KeyY' || (ev.code === 'KeyZ' && ev.shiftKey)) {
    ev.preventDefault();
    redo();
  }
});
