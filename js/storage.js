/* Локальное хранилище в браузере (IndexedDB): копия данных, кэш картинок, очередь на отправку. */
const lsk = () => 'state:' + ((G.sess && G.sess.uid) || 'anon');
const idb = () =>
  new Promise((res, rej) => {
    const r = indexedDB.open('plan-knigi', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
const kvGet = async k => {
  const d = await idb();
  return new Promise((res, rej) => {
    const q = d.transaction('kv').objectStore('kv').get(k);
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
};
const kvSet = async (k, v) => {
  const d = await idb();
  return new Promise((res, rej) => {
    const t = d.transaction('kv', 'readwrite');
    v == null ? t.objectStore('kv').delete(k) : t.objectStore('kv').put(v, k);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
};
const kvDelPrefix = async p => {
  const d = await idb();
  return new Promise((res, rej) => {
    const t = d.transaction('kv', 'readwrite'),
      s = t.objectStore('kv'),
      q = s.openCursor();
    q.onsuccess = () => {
      const c = q.result;
      if (!c) return;
      if (String(c.key).startsWith(p)) c.delete();
      c.continue();
    };
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
};
const saveLocal = async () => {
  if (!G.sess) return;
  try {
    await kvSet(lsk(), { books: S.books, dirty: G.dirty, base: G.base, at: Date.now() });
  } catch (e) {
    toast('Не удалось сохранить копию в браузере');
  }
};
async function readLocalBooks(loc) {
  const b = booksOf(loc);
  return b && b.every(bookOk) ? b : null;
}
const loadPend = async () => {
  try {
    G.pend = new Set((await kvGet('pend:' + G.sess.uid)) || []);
  } catch (e) {
    G.pend = new Set();
  }
};
