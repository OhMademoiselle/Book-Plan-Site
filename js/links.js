/* Ссылки на блоки: вставка, переход, открытие в новом окне. */
function openPicker() {
  const e = curEd();
  if (!e) {
    toast('Сначала поставьте курсор или выделите текст в блоке');
    return;
  }
  saved = { e, r: getSelection().getRangeAt(0).cloneRange() };
  const box = h('div', { class: 'box' }, h('h3', {}, 'На какой блок сделать ссылку?'));
  let cnt = 0;
  S.tabs.forEach(t => {
    const it = [];
    t.blocks.forEach(b => {
      if (b.a) it.push([b, 0]);
      if (b.t === 'group')
        b.items.forEach(c => {
          if (c.a) it.push([c, 1]);
        });
    });
    if (!it.length) return;
    box.append(h('div', { class: 'mh' }, t.name || 'Без названия'));
    it.forEach(([b, l]) => {
      cnt++;
      box.append(
        h(
          'button',
          { class: 'it' + (l ? ' sub' : ''), on: { click: () => insertLink(b) } },
          (l ? '↳ ' : '') + lab(b)
        )
      );
    });
  });
  if (!cnt)
    box.append(
      h(
        'p',
        { class: 'empty' },
        'Пока нет блоков-якорей. Поставьте галочку «⚓ Якорь» в настройках блока (кнопки справа от блока) — после этого на него можно будет сослаться.'
      )
    );
  box.append(h('button', { class: 'add', on: { click: closeModal } }, 'Отмена'));
  modal.replaceChildren(box);
  modal.classList.add('on');
}
function insertLink(b) {
  const { e, r } = saved;
  closeModal();
  e.focus();
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
  const t = r.toString();
  document.execCommand(
    'insertHTML',
    false,
    '<a data-b="' + b.id + '">' + esc(t || ttl(b)) + '</a>' + (t ? '' : ' ')
  );
  fire(e);
}
function go(id) {
  let ti = -1,
    anc = [];
  S.tabs.forEach((t, i) => {
    const r = findBlock(t.blocks, id);
    if (r) {
      ti = i;
      anc = r;
    }
  });
  if (ti < 0) {
    toast('Блок, на который вела ссылка, удалён');
    return;
  }
  anc.forEach(g => (g.c = false));
  if (S.active !== ti || anc.length) {
    S.active = ti;
    upd();
  }
  const el = document.querySelector('[data-id="' + id + '"]');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
}
function openBlockWin(id) {
  let ti = -1;
  S.tabs.forEach((t, i) => {
    if (findBlock(t.blocks, id)) ti = i;
  });
  if (ti < 0) {
    toast('Блок, на который вела ссылка, удалён');
    return;
  }
  const w = window.open(
    location.origin +
      location.pathname +
      location.search +
      '#tab=' +
      ti +
      '&book=' +
      S.bk +
      '&block=' +
      id,
    '_blank'
  );
  if (!w) toast('Браузер заблокировал новое окно: разрешите всплывающие окна для этого сайта');
}
{
  const mn = document.getElementById('main'),
    lnk = ev => ev.target && ev.target.closest && ev.target.closest('a[data-b]');
  mn.addEventListener('click', ev => {
    const a = lnk(ev);
    if (!a) return;
    if (ev.shiftKey) {
      ev.preventDefault();
      openBlockWin(a.dataset.b);
      return;
    }
    if (S.edit && !(ev.ctrlKey || ev.metaKey)) return;
    ev.preventDefault();
    go(a.dataset.b);
  });
  mn.addEventListener('auxclick', ev => {
    if (ev.button !== 1) return;
    const a = lnk(ev);
    if (!a) return;
    ev.preventDefault();
    openBlockWin(a.dataset.b);
  });
  mn.addEventListener('mousedown', ev => {
    if (ev.button === 1 && lnk(ev)) ev.preventDefault();
  });
  mn.addEventListener('mouseover', ev => {
    const a = lnk(ev);
    if (a && !a.hasAttribute('title'))
      a.setAttribute(
        'title',
        (S.edit ? 'Ctrl+клик — перейти к блоку' : 'Клик — перейти к блоку') +
          '. Колёсико мыши или Shift+клик — открыть в новом окне'
      );
  });
  mn.addEventListener('mouseout', ev => {
    const a = lnk(ev);
    if (a) a.removeAttribute('title');
  });
}
