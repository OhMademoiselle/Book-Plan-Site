/* Работа с Supabase: вход, запросы к базе и хранилищу, обработка ошибок. */
const cfg = () => {
  G.url = SUPABASE_URL.trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth)\/v1$/, '');
  G.key = SUPABASE_KEY.trim();
};
const keyBad = k => {
  if (/^sb_secret_/.test(k)) return true;
  try {
    const p = JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return p.role === 'service_role';
  } catch (e) {
    return false;
  }
};
async function tfetch(url, opt = {}, ms = 25000) {
  const ac = new AbortController(),
    to = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...opt, signal: ac.signal });
  } catch (e) {
    throw { net: 1 };
  } finally {
    clearTimeout(to);
  }
}
async function aReq(path, body, o = {}) {
  const r = await tfetch(
    G.url + '/auth/v1/' + path,
    {
      method: o.method || 'POST',
      headers: {
        apikey: G.key,
        'Content-Type': 'application/json',
        ...(o.tok ? { Authorization: 'Bearer ' + o.tok } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    },
    25000
  );
  let j = null;
  try {
    j = await r.json();
  } catch (e) {}
  if (!r.ok)
    throw {
      http: r.status,
      code: (j && (j.error_code || j.code)) || '',
      msg: (j && (j.msg || j.error_description || j.message)) || ''
    };
  return j;
}
function setSess(j, prev) {
  G.sess = {
    access: j.access_token,
    refresh: j.refresh_token,
    exp: Date.now() + (j.expires_in || 3600) * 1000 - 60000,
    uid: (j.user && j.user.id) || (prev && prev.uid),
    email: (j.user && j.user.email) || (prev && prev.email) || ''
  };
  localStorage.setItem(SK, JSON.stringify(G.sess));
}
async function ensureTok() {
  if (!conn()) throw { auth: 1 };
  if (Date.now() < G.sess.exp) return;
  if (!refreshP)
    refreshP = (async () => {
      try {
        const j = await aReq('token?grant_type=refresh_token', { refresh_token: G.sess.refresh });
        setSess(j, G.sess);
      } catch (e) {
        if (e && e.http && e.http >= 400 && e.http < 500 && e.http !== 429) throw { auth: 1 };
        throw e;
      }
    })().finally(() => {
      refreshP = null;
    });
  await refreshP;
}
async function rest(path, opt = {}) {
  await ensureTok();
  const r = await tfetch(
    G.url + '/rest/v1/' + path,
    {
      ...opt,
      headers: {
        apikey: G.key,
        Authorization: 'Bearer ' + G.sess.access,
        'Content-Type': 'application/json',
        ...(opt.headers || {})
      }
    },
    30000
  );
  if (r.status === 401) throw { auth: 1 };
  if (!r.ok) {
    let j = null;
    try {
      j = await r.json();
    } catch (e) {}
    throw { http: r.status, code: (j && j.code) || '', msg: (j && (j.message || j.hint)) || '' };
  }
  return r;
}
async function sto(path, opt = {}) {
  await ensureTok();
  const r = await tfetch(
    G.url + '/storage/v1/' + path,
    {
      ...opt,
      headers: { apikey: G.key, Authorization: 'Bearer ' + G.sess.access, ...(opt.headers || {}) }
    },
    60000
  );
  if (r.status === 401) throw { auth: 1 };
  return r;
}
const errMsg = e =>
  e && e.net
    ? 'Нет связи с облаком. Если интернет есть, а ошибка не пропадает, нажмите ☁ → «Проверить подключение».'
    : e && e.auth
      ? 'Нужно войти снова (правки пока сохранены в этом браузере).'
      : e && (e.code === '42P01' || e.code === 'PGRST205' || e.http === 404)
        ? 'В облаке нет нужной таблицы или хранилища: владельцу сайта нужно выполнить SQL-настройку.'
        : e && (e.code === '42501' || e.http === 403)
          ? 'У аккаунта нет прав на таблицу или хранилище. Владельцу сайта нужно проверить SQL-настройку (политики доступа).'
          : e && e.http === 413
            ? 'Данных слишком много для одной отправки. Уберите часть изображений.'
            : e && e.http === 429
              ? 'Слишком много запросов. Повторю позже.'
              : e &&
                  (e.code === 'invalid_credentials' ||
                    /Invalid login credentials/i.test(e.msg || ''))
                ? 'Неверная почта или пароль.'
                : e && (e.code === 'email_not_confirmed' || /not confirmed/i.test(e.msg || ''))
                  ? 'Почта ещё не подтверждена: откройте письмо от сайта и перейдите по ссылке.'
                  : e &&
                      (e.code === 'user_already_exists' || /already registered/i.test(e.msg || ''))
                    ? 'Такая почта уже зарегистрирована. Нажмите «Войти».'
                    : e && (e.code === 'weak_password' || /at least/i.test(e.msg || ''))
                      ? 'Пароль слишком простой: нужно не меньше 6 символов.'
                      : e &&
                          (e.code === 'over_email_send_rate_limit' ||
                            e.code === 'over_request_rate_limit')
                        ? 'Слишком много писем или попыток. Подождите немного и повторите.'
                        : e && e.code === 'signup_disabled'
                          ? 'Регистрация новых пользователей отключена владельцем сайта.'
                          : e && e.http
                            ? 'Облако вернуло ошибку ' + e.http + (e.msg ? ': ' + e.msg : '') + '.'
                            : (e && e.msg) || 'Что-то пошло не так. Повторите позже.';
async function pull() {
  const a = await (await rest('plan_data?select=data,version&user_id=eq.' + G.sess.uid)).json();
  return a && a[0] ? a[0] : null;
}
const rowOk = r => {
  const b = r && r.data && booksOf(r.data);
  return !!(b && b.every(bookOk));
};
const BADROW = {
  msg: 'Данные в облаке пусты или повреждены. Я ничего не перезаписываю: попросите владельца сайта посмотреть таблицу plan_data.'
};
async function openRow(row) {
  return { books: booksOf(row.data), saved: row.data.saved };
}
async function writeRow(obj, force) {
  const uid = G.sess.uid,
    P = { Prefer: 'return=representation' },
    data = obj;
  let rows;
  if (force) {
    const cur = await pull();
    G.base = cur ? cur.version : null;
  }
  if (G.base == null) {
    try {
      rows = await (
        await rest('plan_data', {
          method: 'POST',
          headers: P,
          body: JSON.stringify({ user_id: uid, data, version: 1 })
        })
      ).json();
    } catch (e) {
      if (e && e.http === 409) throw { conflict: 1 };
      throw e;
    }
  } else {
    rows = await (
      await rest('plan_data?user_id=eq.' + uid + '&version=eq.' + G.base, {
        method: 'PATCH',
        headers: P,
        body: JSON.stringify({ data, version: G.base + 1, updated_at: new Date().toISOString() })
      })
    ).json();
    if (!rows.length) throw { conflict: 1 };
  }
  return rows[0].version;
}
