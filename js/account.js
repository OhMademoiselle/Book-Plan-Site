/* Смена пароля и почты. */
async function checkPass(p) {
  try {
    await aReq('token?grant_type=password', { email: G.sess.email, password: p });
  } catch (e) {
    if (e && (e.http === 400 || e.code === 'invalid_credentials'))
      throw { msg: 'Текущий пароль неверен.' };
    throw e;
  }
}
function changePassScreen() {
  const g = document.getElementById('gate');
  g.style.display = 'flex';
  const pw = ph => h('input', { type: 'password', placeholder: ph, autocomplete: 'off' }),
    o = pw('Текущий пароль'),
    a = pw('Новый пароль (не короче 8 символов)'),
    b = pw('Повторите новый пароль');
  const go = async () => {
    if (a.value.length < 8) {
      gm('Новый пароль должен быть не короче 8 символов.');
      return;
    }
    if (a.value !== b.value) {
      gm('Пароли не совпадают.');
      return;
    }
    gm('Меняю…');
    try {
      await checkPass(o.value);
      await ensureTok();
      await aReq('user', { password: a.value }, { method: 'PUT', tok: G.sess.access });
      g.style.display = 'none';
      toast('Пароль изменён');
    } catch (e) {
      gm((e && e.msg) || errMsg(e));
    }
  };
  [o, a, b].forEach(x =>
    x.addEventListener('keydown', e => {
      if (e.key === 'Enter') go();
    })
  );
  g.replaceChildren(
    h(
      'div',
      { class: 'gbox' },
      h('h2', {}, '🔐 Смена пароля'),
      o,
      a,
      b,
      h('button', { class: 'gbtn', on: { click: go } }, 'Сменить пароль'),
      h(
        'button',
        {
          class: 'gbtn s',
          on: {
            click: () => {
              g.style.display = 'none';
            }
          }
        },
        'Отмена'
      ),
      h('p', { id: 'gmsg' }, '')
    )
  );
}
function changeEmailScreen() {
  const g = document.getElementById('gate');
  g.style.display = 'flex';
  const ei = h('input', { type: 'email', placeholder: 'Новая почта', autocomplete: 'off' }),
    o = h('input', {
      type: 'password',
      placeholder: 'Пароль от аккаунта (для проверки)',
      autocomplete: 'off'
    });
  const go = async () => {
    const ne = ei.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ne)) {
      gm('Введите почту полностью, например name@mail.ru.');
      return;
    }
    if (ne === String(G.sess.email || '').toLowerCase()) {
      gm('Это уже ваша текущая почта.');
      return;
    }
    gm('Проверяю…');
    try {
      await checkPass(o.value);
      await ensureTok();
      await aReq('user', { email: ne }, { method: 'PUT', tok: G.sess.access });
      g.replaceChildren(
        h(
          'div',
          { class: 'gbox' },
          h('h2', {}, '✉️ Подтвердите новую почту'),
          h(
            'p',
            {},
            'Мы отправили письмо со ссылкой на ' +
              ne +
              '. Перейдите по ней, чтобы завершить смену. Если придёт письмо и на старую почту, подтвердите и его. Пока адрес не подтверждён, входите со старой почтой.'
          ),
          h(
            'button',
            {
              class: 'gbtn',
              on: {
                click: () => {
                  g.style.display = 'none';
                }
              }
            },
            'Понятно'
          )
        )
      );
    } catch (e) {
      gm((e && e.msg) || errMsg(e));
    }
  };
  [ei, o].forEach(x =>
    x.addEventListener('keydown', e => {
      if (e.key === 'Enter') go();
    })
  );
  g.replaceChildren(
    h(
      'div',
      { class: 'gbox' },
      h('h2', {}, '✉️ Смена почты'),
      h('p', {}, 'Текущая почта: ' + (G.sess.email || '—')),
      ei,
      o,
      h('button', { class: 'gbtn', on: { click: go } }, 'Сменить почту'),
      h(
        'button',
        {
          class: 'gbtn s',
          on: {
            click: () => {
              g.style.display = 'none';
            }
          }
        },
        'Отмена'
      ),
      h('p', { id: 'gmsg' }, '')
    )
  );
}
