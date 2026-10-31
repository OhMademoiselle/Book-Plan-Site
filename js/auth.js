/* Экраны входа, регистрации и сброса пароля. */
async function initGate() {
  cfg();
  GNOTE = '';
  const hp = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (G.url && G.key && hp.get('access_token') && hp.get('refresh_token')) {
    const tok = hp.get('access_token'),
      type = hp.get('type');
    history.replaceState(null, '', location.pathname + location.search);
    if (type === 'recovery') RECOV = { token: tok };
    else {
      try {
        const u = await aReq('user', null, { method: 'GET', tok });
        setSess({
          access_token: tok,
          refresh_token: hp.get('refresh_token'),
          expires_in: parseInt(hp.get('expires_in')) || 3600,
          user: u
        });
      } catch (e) {
        GNOTE = 'Не удалось войти по ссылке из письма: ' + errMsg(e);
      }
    }
  } else if (hp.get('error')) {
    GNOTE =
      'Ссылка из письма недействительна или устарела: ' +
      (hp.get('error_description') || hp.get('error')).replace(/\+/g, ' ');
    history.replaceState(null, '', location.pathname + location.search);
  }
  gateUI();
}
function gateUI(retry) {
  const g = document.getElementById('gate');
  g.style.display = 'flex';
  let note = GNOTE;
  GNOTE = '';
  cfg();
  G.sess = null;
  try {
    const o = JSON.parse(localStorage.getItem(SK));
    if (o && o.refresh) G.sess = o;
  } catch (e) {}
  const gb = (l, f, s) => h('button', { class: 'gbtn' + (s ? ' s' : ''), on: { click: f } }, l),
    box = (...c) =>
      g.replaceChildren(
        h(
          'div',
          { class: 'gbox' },
          h('h2', {
            class: 'logo',
            innerHTML:
              '<svg class="lgm" viewBox="0 0 64 64" aria-hidden="true"><use href="#lg"/></svg><span class="lgt"><b>План</b> <i>книги</i></span>'
          }),
          ...c
        )
      );
  if (!G.url || !G.key) {
    box(h('p', {}, 'Сайт ещё не настроен владельцем. Загляните сюда позже.'));
    return;
  }
  if (keyBad(G.key)) {
    box(
      h(
        'p',
        {},
        'В настройках сайта указан секретный ключ Supabase. Его нельзя использовать на сайте: он даёт полный доступ к базе. Замените его на Publishable (anon) key и создайте новый секретный ключ в Supabase.'
      )
    );
    return;
  }
  if (RECOV) {
    const pw = h('input', {
        type: 'password',
        placeholder: 'Новый пароль (не короче 8 символов)',
        autocomplete: 'new-password'
      }),
      go = async () => {
        if (pw.value.length < 8) {
          gm('Пароль должен быть не короче 8 символов.');
          return;
        }
        gm('Меняю пароль…');
        try {
          await aReq('user', { password: pw.value }, { method: 'PUT', tok: RECOV.token });
          RECOV = null;
          GNOTE = 'Пароль изменён. Войдите с новым паролем.';
          gateUI();
        } catch (e) {
          gm(errMsg(e));
        }
      };
    pw.addEventListener('keydown', e => {
      if (e.key === 'Enter') go();
    });
    box(
      h('p', {}, 'Придумайте новый пароль для входа в аккаунт.'),
      pw,
      gb('Сохранить пароль', go),
      h('p', { id: 'gmsg' }, '')
    );
    return;
  }
  if (G.sess) {
    box(
      h('p', { id: 'gmsg' }, note || 'Подключаюсь к облаку…'),
      gb('Повторить', () => {
        gm('Подключаюсь…');
        connect();
      }),
      gb(
        'Войти в другой аккаунт',
        () => {
          localStorage.removeItem(SK);
          G.sess = null;
          gateUI(true);
        },
        1
      ),
      gb('Работать офлайн (данные сохранятся на устройстве)', () => startOffline(), 1)
    );
    if (!retry) connect();
    return;
  }
  authScreen('login', note);
}
function authScreen(mode, note) {
  const g = document.getElementById('gate'),
    reg = mode === 'reg',
    gb2 = (l, f) => h('button', { class: 'gbtn', on: { click: f } }, l),
    lk = (t, f) =>
      h(
        'p',
        { class: 'gnote' },
        h(
          'a',
          {
            href: '#',
            on: {
              click: e => {
                e.preventDefault();
                f(e);
              }
            }
          },
          t
        )
      );
  const em = h('input', {
      type: 'email',
      placeholder: 'Почта',
      autocomplete: 'username',
      name: 'email'
    }),
    pw = h('input', {
      type: 'password',
      name: 'password',
      placeholder: reg ? 'Пароль (не короче 8 символов)' : 'Пароль',
      autocomplete: reg ? 'new-password' : 'current-password'
    }),
    msg = h('p', { id: 'gmsg' }, note || '');
  const submit = async () => {
    const email = em.value.trim().toLowerCase(),
      pass = pw.value;
    if (!email || !pass) {
      gm('Введите почту и пароль.');
      return;
    }
    if (reg && pass.length < 8) {
      gm('Пароль должен быть не короче 8 символов.');
      return;
    }
    gm(reg ? 'Создаю аккаунт…' : 'Вхожу…');
    try {
      if (reg) {
        const j = await aReq('signup', { email, password: pass });
        if (j && j.access_token) {
          setSess(j);
          gateUI();
        } else
          gm(
            'Мы отправили письмо на ' +
              email +
              '. Откройте его и подтвердите почту, потом нажмите «Войти».'
          );
      } else {
        const j = await aReq('token?grant_type=password', { email, password: pass });
        setSess(j);
        gateUI();
      }
    } catch (e) {
      gm(errMsg(e));
    }
  };
  [em, pw].forEach(x =>
    x.addEventListener('keydown', e => {
      if (e.key === 'Enter') submit();
    })
  );
  g.replaceChildren(
    h(
      'div',
      { class: 'gbox' },
      h('h2', {
        class: 'logo',
        innerHTML:
          '<svg class="lgm" viewBox="0 0 64 64" aria-hidden="true"><use href="#lg"/></svg><span class="lgt"><b>План</b> <i>книги</i></span>'
      }),
      h(
        'p',
        {},
        reg
          ? 'Создайте аккаунт: данные будут сохраняться в облаке и будут доступны с любого устройства.'
          : 'Войдите в свой аккаунт, чтобы продолжить.'
      ),
      em,
      pw,
      gb2(reg ? 'Зарегистрироваться' : 'Войти', submit),
      msg,
      lk(reg ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться', () =>
        authScreen(reg ? 'login' : 'reg')
      ),
      reg
        ? ''
        : lk('Забыли пароль?', async () => {
            const email = em.value.trim();
            if (!email) {
              gm('Введите почту, на неё придёт ссылка для смены пароля.');
              return;
            }
            try {
              await aReq('recover?redirect_to=' + enc(redirectUri()), { email });
              gm('Если такая почта зарегистрирована, мы отправили на неё ссылку для смены пароля.');
            } catch (x) {
              gm(errMsg(x));
            }
          })
    )
  );
}
async function signOut() {
  if (G.dirty && conn()) await pushNow();
  const still = G.dirty,
    uid = G.sess && G.sess.uid;
  if (!still && uid) {
    await kvSet('state:' + uid, null).catch(() => {});
    await kvDelPrefix('img:' + uid + ':').catch(() => {});
    await kvSet('pend:' + uid, null).catch(() => {});
  } else toast('Часть правок не отправлена: она останется на этом устройстве до следующего входа.');
  try {
    if (G.sess) await aReq('logout', null, { tok: G.sess.access });
  } catch (e) {}
  Object.values(IMGU).forEach(u => {
    try {
      URL.revokeObjectURL(u);
    } catch (e) {}
  });
  for (const k in IMGU) delete IMGU[k];
  localStorage.removeItem(SK);
  G.sess = null;
  G.ready = false;
  G.base = null;
  G.dirty = false;
  G.pend = new Set();
  S.books = [newBook('Моя книга')];
  S.bk = S.books[0].id;
  S.active = 0;
  closeBookMenu();
  render();
  closeModal();
  updBk();
  gateUI(true);
}
