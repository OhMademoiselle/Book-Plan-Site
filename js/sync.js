/* Синхронизация с облаком: сохранение, конфликты версий, офлайн-режим, подключение. */
function dataChanged() {
  if (!G.ready) return;
  G.dirty = true;
  saveLocal();
  updBk();
  schedPush();
}
function schedPush() {
  clearTimeout(G.timer);
  G.timer = setTimeout(pushNow, 5000);
}
async function pushNow() {
  clearTimeout(G.timer);
  if (!G.ready || !conn() || !G.dirty || G.pushing) return;
  G.pushing = true;
  G.err = '';
  updBk();
  const snap = snapAll(),
    force = G.force;
  try {
    await uploadPending();
    const obj = { app: 'plan-knigi', v: 4, saved: new Date().toISOString(), books: S.books };
    let ver;
    try {
      ver = await writeRow(obj, force);
    } catch (e) {
      if (e && e.conflict) {
        const cur = await pull();
        if (!cur) {
          G.base = null;
          ver = await writeRow(obj, false);
        } else {
          let same = false;
          try {
            const o = await openRow(cur);
            same = JSON.stringify(o.books) === JSON.stringify(S.books);
          } catch (x) {}
          if (same) ver = cur.version;
          else throw { conflict: 1 };
        }
      } else throw e;
    }
    G.offline = false;
    G.base = ver;
    G.at = Date.now();
    G.force = false;
    if (snapAll() === snap) G.dirty = false;
    await saveLocal();
  } catch (e) {
    if (e && e.conflict) {
      G.offline = false;
      G.err = 'conflict';
    } else if (e && e.auth) G.err = 'auth';
    else if (e && e.net) {
      G.offline = true;
      G.timer = setTimeout(pushNow, 30000);
    } else G.err = errMsg(e);
  }
  G.pushing = false;
  updBk();
  if (G.dirty && !G.err && !G.offline) schedPush();
}
function statusText() {
  return !conn()
    ? 'вы не вошли в аккаунт: данные хранятся только на этом устройстве'
    : G.err === 'auth'
      ? 'нужно войти снова (правки пока сохранены в этом браузере)'
      : G.offline
        ? 'нет связи с облаком — правки сохраняются на этом устройстве и отправятся, когда связь появится'
        : G.pushing
          ? 'сохраняю…'
          : G.err === 'conflict'
            ? 'в облаке другая версия данных — выберите, какую оставить'
            : G.err
              ? G.err
              : G.dirty
                ? 'есть несохранённые правки, отправлю через несколько секунд'
                : 'всё сохранено' + (G.at ? ' · ' + fmtT(G.at) : '');
}
function updBk() {
  const b = document.getElementById('bk');
  if (!b) return;
  const st = !G.ready
    ? ['off', 'Аккаунт']
    : !conn()
      ? ['off', 'Не вошли']
      : G.err === 'auth'
        ? ['bad', 'Войдите снова']
        : G.offline
          ? ['wait', 'Офлайн']
          : G.pushing
            ? ['wait', 'Сохраняю…']
            : G.err === 'conflict'
              ? ['bad', 'Конфликт версий']
              : G.err
                ? ['bad', 'Ошибка сохранения']
                : G.dirty
                  ? ['wait', 'Не сохранено']
                  : ['ok', 'Сохранено'];
  b.textContent = '● ' + st[1];
  b.dataset.s = st[0];
  b.title = G.ready
    ? (G.sess && G.sess.email ? G.sess.email + ': ' : '') + statusText()
    : 'Аккаунт';
}
window.addEventListener('beforeunload', e => {
  if (G.ready && conn() && G.dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
function startApp(books, pushFlag) {
  const fix = bl =>
    bl.forEach(b => {
      b.id = b.id || uid();
      if (b.items) fix(b.items);
    });
  books.forEach(b => b.tabs.forEach(t => fix(t.blocks)));
  const ids = books.map(b => b.id),
    first = !G.ready;
  S.books = books;
  S.bk =
    W2 && !W2done && BOOKQ && ids.includes(BOOKQ[1])
      ? BOOKQ[1]
      : ids.includes(S.bk)
        ? S.bk
        : ids.includes(UI.book)
          ? UI.book
          : ids[0];
  const act =
    W2 && !W2done
      ? +TABQ[1]
      : first
        ? UI.acts
          ? UI.acts[S.bk] || 0
          : UI.book === S.bk || !UI.book
            ? Number(UI.active) || 0
            : 0
        : S.active;
  W2done = true;
  S.active = Math.max(0, Math.min(act, S.tabs.length - 1));
  G.ready = true;
  G.dirty = !!pushFlag;
  G.err = '';
  H.u = [];
  H.r = [];
  H.cur = snapS();
  H.cs = strip(H.cur);
  MM = null;
  updHist();
  document.getElementById('gate').style.display = 'none';
  render();
  updBk();
  saveLocal();
  q.value = '';
  if (pushFlag) pushNow();
  if (W2 && BLOCKQ && !W2blk) {
    W2blk = true;
    setTimeout(() => go(BLOCKQ[1]), 350);
  }
  if (!W2 && !BKP_TIMER) BKP_TIMER = setTimeout(maybeBackupReminder, BKP_DELAY);
  if (!W2 && !TOUR_TIMER && !tourDone()) TOUR_TIMER = setTimeout(maybeTour, TOUR_DELAY);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
function conflictGate(loc, remote) {
  return new Promise(res => {
    const gb = (l, f, s) => h('button', { class: 'gbtn' + (s ? ' s' : ''), on: { click: f } }, l);
    document.getElementById('gate').replaceChildren(
      h(
        'div',
        { class: 'gbox' },
        h('h2', {}, 'Найдены две версии'),
        h(
          'p',
          {},
          'В облаке: от ' +
            fmtT(remote.saved) +
            '. На этом устройстве есть несохранённые правки от ' +
            fmtT(loc.at) +
            '. Какую оставить?'
        ),
        gb(
          '⬇ Сначала скачать версию с устройства (.json)',
          () =>
            dl(
              JSON.stringify({
                app: 'plan-knigi',
                v: 4,
                saved: new Date(loc.at).toISOString(),
                books: loc.books
              }),
              'устройство'
            ),
          1
        ),
        gb('Оставить версию из облака', () => res('remote')),
        gb('Оставить версию с устройства (облако обновится)', () => res('local'))
      )
    );
  });
}
async function startOffline() {
  const loc = await kvGet(lsk()).catch(() => null),
    books = await readLocalBooks(loc);
  if (!books) {
    toast('На этом устройстве ещё нет сохранённых данных: для первого входа нужен интернет.');
    return;
  }
  G.base = loc.base != null ? loc.base : null;
  G.offline = conn();
  await loadPend();
  startApp(books, !!loc.dirty);
  if (conn()) {
    G.offline = true;
    updBk();
    toast('Нет связи с облаком — работаю офлайн. Правки сохранятся, когда связь появится.');
  }
}
async function reconnect() {
  if (!G.ready || !conn() || !G.offline || G.busyRc) return;
  G.busyRc = true;
  try {
    if (G.dirty) {
      await pushNow();
    } else {
      const row = await pull();
      if (row) {
        if (!rowOk(row)) throw BADROW;
        if (row.version !== G.base && !G.dirty) {
          const o = await openRow(row);
          G.base = row.version;
          startApp(o.books, false);
          toast('Загружена свежая версия из облака');
        } else G.base = row.version;
      }
      G.offline = false;
      G.err = '';
    }
  } catch (e) {
    if (!(e && e.net)) {
      G.err = e && e.auth ? 'auth' : errMsg(e);
      G.offline = false;
    }
  }
  G.busyRc = false;
  updBk();
}
async function connect() {
  try {
    const row = await pull();
    if (G.ready) {
      document.getElementById('gate').style.display = 'none';
      G.offline = true;
      await reconnect();
      return;
    }
    if (row && !rowOk(row)) throw BADROW;
    const loc = await kvGet(lsk()).catch(() => null);
    await loadPend();
    const remote = row ? await openRow(row) : null,
      locB = await readLocalBooks(loc);
    let books,
      pf = false;
    if (!remote) {
      G.base = null;
      books = locB || [newBook('Моя книга')];
      pf = true;
    } else if (!locB || !loc.dirty) {
      books = remote.books;
      G.base = row.version;
    } else if (loc.base != null && loc.base === row.version) {
      books = locB;
      G.base = row.version;
      pf = true;
    } else {
      const pick = await conflictGate({ books: locB, at: loc.at }, remote);
      G.base = row.version;
      if (pick === 'remote') books = remote.books;
      else {
        books = locB;
        pf = true;
      }
    }
    if (await storeInlineBooks(books)) pf = true;
    startApp(books, pf);
  } catch (e) {
    if (G.ready) return;
    if (e && e.net) {
      startOffline();
      return;
    }
    if (e && e.auth) {
      localStorage.removeItem(SK);
      G.sess = null;
      GNOTE = 'Вход истёк. Войдите снова.';
      gateUI();
      return;
    }
    gateUI(true);
    gm(errMsg(e));
  }
}
/* офлайн: повторные попытки подключиться */
setInterval(reconnect, 30000);
window.addEventListener('online', reconnect);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) reconnect();
});
