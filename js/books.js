/* Меню книг в шапке: переключение, создание, переименование, удаление. */
const bkm = document.getElementById('bkm'),
  bkc = document.getElementById('bkc');
function renderBookBtn() {
  if (!bkc) return;
  const b = curBook();
  bkc.replaceChildren(
    h('span', {}, '📚'),
    h('span', { class: 'n' }, b.name || 'Книга'),
    h('span', {}, '▾')
  );
  bkc.title = 'Книга «' + b.name + '». Нажмите, чтобы переключить, создать или удалить';
}
function closeBookMenu() {
  if (bkm) bkm.classList.remove('on');
}
function createBook(name, tpl) {
  const b = newBook(name, tpl);
  S.books.push(b);
  commit();
  enterBook(b.id);
  dataChanged();
  toast('Создана книга «' + name + '»');
}
function deleteBook() {
  const i = S.books.findIndex(b => b.id === S.bk);
  if (S.books.length < 2 || i < 0) return;
  const name = S.books[i].name;
  S.books.splice(i, 1);
  if (UI.acts) delete UI.acts[S.bk];
  enterBook(S.books[Math.max(0, i - 1)].id);
  dataChanged();
  toast('Книга «' + name + '» удалена');
}
function bookMenu(mode) {
  if (!bkm) return;
  bkm.classList.add('on');
  const cur = curBook(),
    B = (l, f, c) =>
      h('button', { type: 'button', class: 'bki' + (c ? ' ' + c : ''), on: { click: f } }, l),
    btns = (...x) => h('div', { class: 'bf' }, ...x),
    bt = (l, f, c) => h('button', { type: 'button', class: c || '', on: { click: f } }, l);
  if (mode === 'new' || mode === 'ren') {
    const inp = h('input', {
        type: 'text',
        maxLength: 40,
        placeholder: 'Название книги',
        autocomplete: 'off',
        value: mode === 'ren' ? cur.name : ''
      }),
      tp = h('input', { type: 'checkbox', checked: true });
    const go = () => {
      const name = inp.value.trim();
      if (!name) {
        toast('Введите название книги');
        return;
      }
      if (mode === 'ren') {
        cur.name = name;
        dataChanged();
        renderBookBtn();
        bookMenu('list');
        return;
      }
      if (S.books.length >= MAX_BOOKS) {
        toast('Можно хранить до ' + MAX_BOOKS + ' книг');
        return;
      }
      closeBookMenu();
      createBook(name, tp.checked);
    };
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') go();
      if (e.key === 'Escape') bookMenu('list');
    });
    bkm.replaceChildren(
      h('p', {}, mode === 'ren' ? 'Новое название для «' + cur.name + '»' : 'Новая книга'),
      inp,
      ...(mode === 'new'
        ? [h('label', { class: 'bkchk' }, tp, 'Взять шаблон вкладок (Сюжет, Герои)')]
        : []),
      btns(
        bt('Отмена', () => bookMenu('list')),
        bt(mode === 'ren' ? 'Сохранить' : 'Создать', go, 'go')
      )
    );
    inp.focus();
    inp.select();
    return;
  }
  if (mode === 'del') {
    bkm.replaceChildren(
      h(
        'p',
        {},
        'Удалить книгу «' + cur.name + '» вместе со всеми её вкладками? Это нельзя отменить.'
      ),
      btns(
        bt('Отмена', () => bookMenu('list')),
        bt(
          'Удалить',
          () => {
            closeBookMenu();
            deleteBook();
          },
          'dng'
        )
      )
    );
    return;
  }
  const list = h('div', { class: 'bl' });
  S.books.forEach(b =>
    list.append(
      B(
        (b.id === S.bk ? '✓ ' : '') + (b.name || 'Без названия'),
        () => {
          closeBookMenu();
          switchBook(b.id);
        },
        b.id === S.bk ? 'on' : ''
      )
    )
  );
  const nb = B('＋ Новая книга', () => bookMenu('new')),
    rb = B('✎ Переименовать текущую', () => bookMenu('ren')),
    db = B('🗑 Удалить текущую', () => bookMenu('del'), 'dng'),
    items = [list, h('hr'), nb, rb, db];
  if (S.books.length < 2) {
    db.disabled = true;
    db.title = 'Последнюю книгу удалить нельзя';
  }
  bkm.replaceChildren(...items);
}
if (bkc) {
  bkc.onclick = () => {
    bkm.classList.contains('on') ? closeBookMenu() : bookMenu('list');
  };
  document.addEventListener('mousedown', e => {
    if (bkm.classList.contains('on') && !(e.target.closest && e.target.closest('.bkw')))
      closeBookMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeBookMenu();
  });
}
