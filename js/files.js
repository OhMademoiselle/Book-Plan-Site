/* Файл резервной копии: скачивание и восстановление. */
async function backupData() {
  const bs = JSON.parse(JSON.stringify(S.books));
  const walk = async bl => {
    for (const b of bl) {
      if (b.t === 'img' && b.src && !/^data:/.test(b.src)) {
        try {
          b.src = await imgDataUrl(b.src);
        } catch (e) {
          b.src = '';
        }
      }
      if (b.items) await walk(b.items);
    }
  };
  for (const bk of bs) for (const tb of bk.tabs) await walk(tb.blocks);
  return JSON.stringify({ app: 'plan-knigi', v: 4, saved: new Date().toISOString(), books: bs });
}
async function restoreFrom(t) {
  let o;
  try {
    o = JSON.parse(t);
  } catch (e) {
    bsay('Это не файл копии: не удалось разобрать содержимое.');
    return;
  }
  let bs = null;
  if (o && Array.isArray(o.books) && o.books.length && o.books.every(bookOk)) bs = o.books;
  else if (o && Array.isArray(o.tabs) && o.tabs.length && o.tabs.every(tabOk))
    bs = [{ id: 'x', name: 'Книга из файла', tabs: o.tabs }];
  if (!bs) {
    bsay('В файле нет данных этого сайта.');
    return;
  }
  if (S.books.length + bs.length > MAX_BOOKS) {
    bsay('Слишком много книг: можно хранить до ' + MAX_BOOKS + '. Удалите ненужные и повторите.');
    return;
  }
  const taken = new Set(S.books.map(b => b.name)),
    uniq = n => {
      let k = n,
        i = 2;
      if (taken.has(k)) {
        k = n + ' (из файла)';
        while (taken.has(k)) k = n + ' (из файла ' + i++ + ')';
      }
      taken.add(k);
      return k;
    };
  bs = bs.map(b => ({
    id: 'b' + uid(),
    name: uniq(String(b.name || 'Книга').slice(0, 40)),
    tabs: b.tabs
  }));
  const fix = bl =>
    bl.forEach(b => {
      b.id = b.id || uid();
      if (b.items) fix(b.items);
    });
  bs.forEach(b => b.tabs.forEach(x => fix(x.blocks)));
  if (G.sess) await storeInlineBooks(bs);
  S.books.push(...bs);
  commit();
  enterBook(bs[0].id);
  dataChanged();
  bsay(
    'Добавлено книг из файла: ' +
      bs.length +
      '. Ничего из ваших прежних книг не удалено; ненужную можно удалить в меню «📚».'
  );
}
const fr = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
document.body.append(fr);
fr.onchange = () => {
  const f = fr.files[0];
  fr.value = '';
  if (f)
    f.text()
      .then(restoreFrom)
      .catch(() => bsay('Не удалось прочитать файл.'));
};
