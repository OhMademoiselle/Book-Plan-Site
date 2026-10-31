/* Отрисовка страницы: режим правки/чтения, вкладки, блоки. */
function renderMode() {
  if (!S.edit) MM = null;
  document.body.classList.toggle('mm', !!MM);
  document.body.classList.toggle('read', !S.edit);
  document.getElementById('mode').replaceChildren(
    ...[
      [true, '✏️ Правка'],
      [false, '👁 Чтение']
    ].map(([v, l]) =>
      h(
        'button',
        {
          class: 'seg' + (S.edit === v ? ' on' : ''),
          on: {
            click: () => {
              S.edit = v;
              upd();
            }
          }
        },
        l
      )
    )
  );
}
function openTabWin(i) {
  const w = window.open(
    location.origin + location.pathname + location.search + '#tab=' + i + '&book=' + S.bk,
    '_blank'
  );
  if (!w) toast('Браузер заблокировал новое окно: разрешите всплывающие окна для этого сайта');
}
function renderTabs() {
  const t = document.getElementById('tabs');
  t.replaceChildren();
  if (W2 && S.tabs[S.active])
    document.title = (S.tabs[S.active].name || 'Вкладка') + ' · ' + curBook().name;
  S.tabs.forEach((tb, i) => {
    const on = i === S.active;
    const b = h(
      'button',
      {
        class: 'tab' + (on ? ' on' : ''),
        draggable: S.edit,
        title:
          (S.edit
            ? on
              ? 'Двойной клик — переименовать. Перетащите, чтобы переставить. '
              : 'Перетащите, чтобы переставить. '
            : '') + 'Колёсико мыши или Ctrl+клик — открыть в новом окне',
        on: {
          click: ev => {
            if (ev.ctrlKey || ev.metaKey) {
              openTabWin(i);
              return;
            }
            if (!on) {
              S.active = i;
              upd();
            }
          },
          auxclick: ev => {
            if (ev.button === 1) {
              ev.preventDefault();
              openTabWin(i);
            }
          },
          mousedown: ev => {
            if (ev.button === 1) ev.preventDefault();
          },
          dblclick: () => {
            if (on && S.edit) rename(b, tb);
          }
        }
      },
      tb.name || 'Без названия'
    );
    tabDnd(b, i);
    t.append(b);
    if (on && S.tabs.length > 1)
      t.append(
        delBtn(() => {
          S.tabs.splice(i, 1);
          S.active = Math.max(0, i - 1);
          upd();
        }, '✕')
      );
  });
  t.append(
    h(
      'button',
      {
        class: 'tab new',
        title: 'Новая вкладка',
        on: {
          click: () => {
            S.tabs.push({ name: 'Новая вкладка', blocks: [{ id: uid(), t: 'p', x: '' }] });
            S.active = S.tabs.length - 1;
            upd();
          }
        }
      },
      '+'
    )
  );
  const a = t.querySelector('.tab.on');
  if (a) {
    const r = a.getBoundingClientRect(),
      c = t.getBoundingClientRect();
    if (r.bottom > c.bottom) t.scrollTop += r.bottom - c.bottom;
    else if (r.top < c.top) t.scrollTop -= c.top - r.top;
  }
}
function renderBlocks() {
  CS = null;
  const m = document.getElementById('main');
  m.replaceChildren();
  const bl = S.tabs[S.active].blocks;
  bl.forEach((_, i) => m.append(blockEl(bl, i, null)));
  if (!bl.length)
    m.append(
      h(
        'p',
        { class: 'empty' },
        S.edit ? 'Здесь пока пусто. Добавьте блок кнопками внизу.' : 'Здесь пока пусто.'
      )
    );
}
function render() {
  renderMode();
  renderTabs();
  renderBlocks();
  renderMM();
  renderBookBtn();
}
