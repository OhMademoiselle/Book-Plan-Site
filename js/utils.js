/* Мелкие вспомогательные функции: создание элементов, экранирование, уведомления, кодирование, даты, скачивание файлов. */
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
const h = (t, a = {}, ...c) => {
  const e = document.createElement(t);
  for (const k in a) {
    if (k === 'on') for (const v in a.on) e.addEventListener(v, a.on[v]);
    else if (k in e) e[k] = a[k];
    else e.setAttribute(k, a[k]);
  }
  c.flat().forEach(x => e.append(x));
  return e;
};
let tt;
const toast = m => {
  const t = document.getElementById('toast');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove('on'), 2400);
};
const conn = () => !!(G.sess && G.sess.refresh),
  enc = encodeURIComponent;
const stamp = () => {
  const d = new Date(),
    p = n => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    p(d.getMonth() + 1) +
    '-' +
    p(d.getDate()) +
    ' ' +
    p(d.getHours()) +
    '-' +
    p(d.getMinutes())
  );
};
const fmtT = x => (x ? new Date(x).toLocaleString('ru-RU') : '—');
function dl(data, tag, ext, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: type || 'application/json' }));
  a.download = 'plan-knigi-' + tag + '-' + stamp().replace(' ', '_') + '.' + (ext || 'json');
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
}
const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, '');
const b64 = u => {
  u = u instanceof Uint8Array ? u : new Uint8Array(u);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000)
    s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const rnd = n => crypto.getRandomValues(new Uint8Array(n));
const newName = () => b64(rnd(12)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
