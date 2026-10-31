/* Окно «Настройки» и проверка подключения к облаку. */
async function diag(say) {
  const out = [];
  const line = (ok, l, v) => {
    out.push((ok ? '✓ ' : '✗ ') + l + (v ? ' — ' + v : ''));
    say(out.join('\n'));
  };
  const bad = e =>
    e && e.net
      ? 'нет ответа (интернет или запрет браузера)'
      : e && e.auth
        ? 'вход истёк'
        : e && (e.code === '42P01' || e.code === 'PGRST205')
          ? 'таблицы plan_data нет: выполните SQL-настройку'
          : errMsg(e);
  const step = async (l, f) => {
    try {
      const v = await f();
      line(true, l, v);
      return true;
    } catch (e) {
      line(false, l, bad(e));
      return false;
    }
  };
  if (
    !(await step('Адрес и ключ проекта', async () => {
      const r = await tfetch(G.url + '/auth/v1/settings', { headers: { apikey: G.key } }, 25000);
      if (!r.ok) throw { http: r.status };
      const j = await r.json();
      return (
        'проект отвечает; подтверждение почты ' +
        (j.mailer_autoconfirm ? 'выключено' : 'включено') +
        ', регистрация ' +
        (j.disable_signup ? 'закрыта' : 'открыта')
      );
    }))
  )
    return;
  if (
    !(await step('Вход в аккаунт', async () => {
      await ensureTok();
      return G.sess.email || 'выполнен';
    }))
  )
    return;
  if (
    !(await step('Таблица данных', async () => {
      const r = await (await rest('plan_data?select=version&user_id=eq.' + G.sess.uid)).json();
      return r.length
        ? 'ваша запись есть (версия ' + r[0].version + ')'
        : 'таблица есть, ваших данных ещё нет';
    }))
  )
    return;
  await step('Запись в таблицу', async () => {
    const r = await (
      await rest('plan_data?user_id=eq.' + G.sess.uid, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ updated_at: new Date().toISOString() })
      })
    ).json();
    return r.length ? 'разрешена' : 'пропущено: данных ещё нет';
  });
  await step('Хранилище изображений', async () => {
    const r = await sto('object/list/plan-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: G.sess.uid, limit: 1, offset: 0 })
    });
    if (r.status === 404) throw { msg: 'хранилища plan-images нет: выполните обновлённый SQL' };
    if (!r.ok) throw { http: r.status };
    return 'доступно';
  });
  out.push('');
  out.push(
    out.some(x => x.startsWith('✗'))
      ? 'Есть ошибки. Покажите этот текст тому, кто помогает с сайтом.'
      : 'Всё работает: данные и изображения сохраняются в облаке.'
  );
  say(out.join('\n'));
}
function openSettings() {
  const st = h('p', { id: 'bst' }, ''),
    info = h('p', { id: 'gst', class: 'sett-note' }, ''),
    pre = h('pre', { class: 'gpre' });
  bsay = m => {
    st.textContent = m;
  };
  const refresh = () => {
    const lb = bkState().last;
    info.textContent =
      (G.ready && conn()
        ? 'Состояние: ' + statusText()
        : 'Вы не вошли в аккаунт: данные хранятся только на этом устройстве.') +
      ' · ' +
      (lb ? 'Копия-файл скачивалась: ' + fmtT(lb) + '.' : 'Копию-файл вы ещё не скачивали.');
    updBk();
  };
  const B = (l, f, c) => h('button', { class: 'it' + (c ? ' ' + c : ''), on: { click: f } }, l),
    act = f => async () => {
      try {
        await f();
      } catch (e) {
        bsay(errMsg(e));
      }
      refresh();
    };
  const box = h('div', { class: 'box' }, h('h3', {}, '⚙ Настройки'));
  /* оформление */
  const grid = h('div', { class: 'thg' }),
    paint = () => {
      const cur = getTheme();
      [...grid.children].forEach(b => b.classList.toggle('on', b.dataset.t === cur));
    };
  THEMES.forEach(t =>
    grid.append(
      h(
        'button',
        {
          class: 'thb',
          type: 'button',
          'data-t': t[0],
          on: {
            click: () => {
              setTheme(t[0]);
              paint();
            }
          }
        },
        h('i', { style: 'background:' + t[3] }),
        t[1] + ' ' + t[2]
      )
    )
  );
  paint();
  box.append(h('div', { class: 'mh' }, 'Оформление'), grid);
  /* аккаунт */
  box.append(h('div', { class: 'mh' }, 'Аккаунт'));
  if (G.ready && conn())
    box.append(
      h('p', { class: 'sett-note' }, 'Почта: ' + (G.sess.email || '—')),
      B('🔐 Сменить пароль', () => {
        closeModal();
        changePassScreen();
      }),
      B('✉️ Сменить почту', () => {
        closeModal();
        changeEmailScreen();
      }),
      B('Выйти из аккаунта', signOut)
    );
  else
    box.append(
      B('🔗 Войти или зарегистрироваться', () => {
        closeModal();
        gateUI(true);
      })
    );
  /* помощь */
  box.append(
    h('div', { class: 'mh' }, 'Помощь'),
    B('🎓 Пройти обучение заново', () => {
      closeModal();
      startTour();
    })
  );
  /* данные и облако */
  box.append(h('div', { class: 'mh' }, 'Данные и облако'), info);
  const copyFile = B('⬇ Скачать копию (.json)', async () => {
    bsay('Готовлю копию…');
    dl(await backupData(), 'копия');
    markBackup();
    refresh();
    bsay(
      'Файл скачан. Положите его в надёжное место: на флешку, в облачный диск или отправьте себе на почту.'
    );
  });
  if (G.ready && conn()) {
    if (G.err === 'conflict')
      box.append(
        B(
          '⬇ Скачать мою версию и загрузить версию из облака',
          act(async () => {
            dl(await backupData(), 'моя-версия');
            const row = await pull(),
              o = await openRow(row);
            G.base = row.version;
            startApp(o.books, false);
            bsay('Загружена версия из облака.');
          })
        ),
        B(
          'Перезаписать облако моей версией',
          act(async () => {
            G.force = true;
            G.err = '';
            G.dirty = true;
            await pushNow();
          })
        )
      );
    if (G.err === 'auth')
      box.append(
        B('🔑 Войти снова', () => {
          closeModal();
          localStorage.removeItem(SK);
          G.sess = null;
          G.ready = false;
          gateUI(true);
        })
      );
    let armed = false;
    box.append(
      B(
        '☁ Сохранить сейчас',
        act(async () => {
          bsay('Сохраняю…');
          G.err = '';
          G.dirty = true;
          await pushNow();
          bsay(G.err ? '' : 'Готово: данные в облаке.');
        })
      ),
      B('🩺 Проверить подключение', () => {
        bsay('Проверяю…');
        diag(t => {
          pre.textContent = t;
        }).then(() => bsay(''));
      }),
      pre,
      copyFile,
      B('⬆ Восстановить из файла…', () => fr.click()),
      B(
        '🧹 Удалить неиспользуемые изображения',
        act(async () => {
          if (!armed) {
            armed = true;
            bsay(
              'Из облака удалятся изображения, которых нет в ваших блоках. Отмена (↶) их уже не вернёт. Нажмите ещё раз, чтобы продолжить.'
            );
            return;
          }
          armed = false;
          const n = await cleanImages();
          bsay(n ? 'Удалено файлов: ' + n + '.' : 'Неиспользуемых изображений нет.');
        })
      )
    );
  } else
    box.append(
      copyFile,
      B('⬆ Восстановить из файла…', () => fr.click())
    );
  box.append(
    st,
    h(
      'p',
      { class: 'gnote' },
      'Автоматических резервных копий в облаке нет, поэтому изредка скачивайте файл копии.'
    ),
    h('button', { class: 'add', on: { click: closeModal } }, 'Закрыть')
  );
  modal.replaceChildren(box);
  modal.classList.add('on');
  refresh();
}
document.getElementById('bk').onclick = async () => {
  if (!G.ready) return;
  if (!conn() || G.err || G.pushing) {
    if (!G.pushing) openSettings();
    return;
  }
  G.dirty = true;
  await pushNow();
  toast(
    G.err === 'conflict'
      ? 'В облаке другая версия: откройте ⚙ Настройки'
      : G.err
        ? 'Не удалось сохранить: ' + statusText()
        : G.offline
          ? 'Нет связи: сохраню, когда появится'
          : 'Сохранено ✓'
  );
};
