/* История изменений: отмена и возврат действий. */
/* история (последние 5 действий) */
let H = { u: [], r: [], t: null, cur: '', cs: '' };
const snapS = () => JSON.stringify(S.tabs),
  snapAll = () => JSON.stringify(S.books),
  strip = j => j.replace(/,"c":(true|false)/g, '');
H.cur = snapS();
H.cs = strip(H.cur);
function updHist() {
  bu.disabled = !H.u.length;
  bd.disabled = !H.r.length;
}
function commit() {
  clearTimeout(H.t);
  const f = snapS(),
    st = strip(f);
  if (st !== H.cs) {
    H.u.push(H.cur);
    if (H.u.length > 5) H.u.shift();
    H.r = [];
  }
  if (f !== H.cur) dataChanged();
  H.cur = f;
  H.cs = st;
  updHist();
}
function touch() {
  save();
  clearTimeout(H.t);
  H.t = setTimeout(commit, 800);
  clearTimeout(G.st);
  G.st = setTimeout(dataChanged, 400);
}
function restore(j) {
  const a0 = JSON.parse(H.cur),
    nt = JSON.parse(j);
  let a = S.active;
  for (let i = 0; i < Math.max(a0.length, nt.length); i++)
    if (JSON.stringify(a0[i]) !== JSON.stringify(nt[i])) {
      a = i;
      break;
    }
  S.tabs = nt;
  S.active = Math.max(0, Math.min(a, nt.length - 1));
  H.cur = j;
  H.cs = strip(j);
  MM = null;
  save();
  dataChanged();
  render();
  updHist();
}
function undo() {
  commit();
  if (!H.u.length) return;
  const p = H.u.pop();
  H.r.push(H.cur);
  restore(p);
}
function redo() {
  commit();
  if (!H.r.length) return;
  const n = H.r.pop();
  H.u.push(H.cur);
  restore(n);
}
