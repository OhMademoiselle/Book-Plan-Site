/* Главное состояние сайта: открытая книга и вкладка (S), состояние облака (G), сохранение настроек вида. */
const UIK = 'plan-knigi-ui';
let S,
  UI = {};
const TABQ = /[#&]tab=(\d+)/.exec(location.hash),
  BOOKQ = /[#&]book=([\w-]+)/.exec(location.hash),
  BLOCKQ = /[#&]block=([\w-]+)/.exec(location.hash),
  W2 = !!TABQ;
let W2blk = false;
let W2done = false;
try {
  UI = JSON.parse(localStorage.getItem(UIK)) || {};
} catch (e) {}
S = {
  v: 2,
  active: Number(UI.active) || 0,
  edit: W2 ? false : UI.edit !== false,
  fmtOpen: !!UI.fmtOpen,
  tabs: [
    {
      name: 'Сюжет',
      blocks: [
        { t: 'h', lv: 1, x: 'Название книги' },
        { t: 'p', x: 'Коротко: о чём эта история?' },
        { t: 'warn', y: 'w', x: 'Не забыть: связать завязку с финалом.' }
      ]
    },
    {
      name: 'Герои',
      blocks: [
        {
          t: 'cards',
          cards: [
            { a: 'Главный герой', b: 'Цель, страх, характер…' },
            { a: 'Антагонист', b: 'Что им движет?' }
          ]
        }
      ]
    }
  ]
};
if (S.v !== 2) {
  S.tabs.forEach(t =>
    t.blocks.forEach(b => {
      if ('x' in b) b.x = esc(b.x || '');
      if (b.rows) b.rows = b.rows.map(r => r.map(esc));
      if (b.cards)
        b.cards.forEach(c => {
          c.a = esc(c.a || '');
          c.b = esc(c.b || '');
        });
    })
  );
  S.v = 2;
}
S.tabs.forEach(t =>
  t.blocks.forEach(b => {
    b.id = b.id || uid();
  })
);
if (typeof S.edit !== 'boolean') S.edit = true;
if (S.active >= S.tabs.length) S.active = 0;
/* несколько книг на одном аккаунте: S.books — все книги, S.tabs — вкладки открытой книги (остальной код работает как раньше) */
S.books = [{ id: 'b' + uid(), name: 'Моя книга', tabs: S.tabs }];
S.bk = S.books[0].id;
function curBook() {
  return S.books.find(b => b.id === S.bk) || S.books[0];
}
delete S.tabs;
Object.defineProperty(S, 'tabs', {
  get() {
    return curBook().tabs;
  },
  set(v) {
    curBook().tabs = v;
  },
  enumerable: false,
  configurable: true
});
const save = () => {
  if (W2) return;
  try {
    const acts = Object.assign({}, UI.acts || {});
    acts[S.bk] = S.active;
    UI.acts = acts;
    UI.book = S.bk;
    localStorage.setItem(
      UIK,
      JSON.stringify({ active: S.active, edit: S.edit, fmtOpen: S.fmtOpen, book: S.bk, acts })
    );
  } catch (e) {}
};
const upd = () => {
  commit();
  save();
  render();
};
function enterBook(id) {
  S.bk = id;
  const a = (UI.acts && UI.acts[id]) || 0;
  S.active = Math.max(0, Math.min(a, S.tabs.length - 1));
  H.u = [];
  H.r = [];
  H.cur = snapS();
  H.cs = strip(H.cur);
  MM = null;
  q.value = '';
  sres.classList.remove('on');
  save();
  render();
  updHist();
}
function switchBook(id) {
  if (id === S.bk || !S.books.some(b => b.id === id)) return;
  commit();
  save();
  enterBook(id);
}
/* публичные адрес и ключ проекта (publishable / anon). Секретный ключ (secret / service_role) сюда вставлять нельзя */
const SK = 'plan-knigi-sb';
const G = {
  url: '',
  key: '',
  sess: null,
  base: null,
  dirty: false,
  pushing: false,
  timer: null,
  st: null,
  err: '',
  at: 0,
  ready: false,
  force: false,
  offline: false,
  busyRc: false,
  pend: new Set()
};
let bsay = () => {},
  GNOTE = '',
  RECOV = null,
  refreshP = null;
