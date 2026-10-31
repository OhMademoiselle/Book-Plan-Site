/* Изображения: сжатие, загрузка в облако, кэш на устройстве, очистка неиспользуемых. */
/* вставка изображений */
async function addImg(f) {
  if (!G.sess) {
    toast('Сначала войдите в аккаунт.');
    return;
  }
  toast('Обрабатываю изображение…');
  try {
    const r = await imgStoreNew(f);
    S.tabs[S.active].blocks.push({ id: uid(), t: 'img', src: r.name, ar: r.ar, iw: 100, x: '' });
    upd();
    window.scrollTo(0, document.body.scrollHeight);
  } catch (e) {
    toast((e && e.msg) || 'Не удалось добавить изображение');
  }
}
const IMGU = {},
  MIMES = ['', 'image/webp', 'image/jpeg', 'image/png'];
async function imgPrepare(file) {
  if (!/^image\//.test(file.type)) throw { msg: 'Выберите файл с изображением.' };
  if (file.size > 30e6) throw { msg: 'Файл слишком большой (больше 30 МБ).' };
  let bmp;
  try {
    bmp = await createImageBitmap(file);
  } catch (e) {
    throw { msg: 'Не удалось открыть изображение.' };
  }
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)),
    w = Math.max(1, Math.round(bmp.width * k)),
    hh = Math.max(1, Math.round(bmp.height * k)),
    c = document.createElement('canvas');
  c.width = w;
  c.height = hh;
  const x = c.getContext('2d');
  x.drawImage(bmp, 0, 0, w, hh);
  const tob = (t, q) => new Promise(r => c.toBlob(r, t, q));
  let bl = await tob('image/webp', 0.82),
    tag = 1;
  if (!bl || bl.type !== 'image/webp') {
    x.globalCompositeOperation = 'destination-over';
    x.fillStyle = '#fff';
    x.fillRect(0, 0, w, hh);
    bl = await tob('image/jpeg', 0.82);
    tag = 2;
  }
  if (!bl) throw { msg: 'Не удалось сжать изображение.' };
  return { tag, body: new Uint8Array(await bl.arrayBuffer()), ar: w / hh };
}
const imgPack = async (tag, body) => {
  const u = new Uint8Array(body.length + 1);
  u[0] = tag;
  u.set(body, 1);
  return u;
};
async function imgStoreNew(file) {
  const p = await imgPrepare(file),
    name = newName(),
    e = await imgPack(p.tag, p.body);
  await kvSet('img:' + G.sess.uid + ':' + name, e.buffer);
  G.pend.add(name);
  await kvSet('pend:' + G.sess.uid, [...G.pend]);
  IMGU[name] = URL.createObjectURL(new Blob([p.body], { type: MIMES[p.tag] }));
  return { name, ar: p.ar };
}
async function loadImg(name) {
  if (IMGU[name]) return IMGU[name];
  let e = await kvGet('img:' + G.sess.uid + ':' + name);
  if (!e) {
    const r = await sto('object/authenticated/plan-images/' + G.sess.uid + '/' + name);
    if (!r.ok) throw { http: r.status };
    e = await r.arrayBuffer();
    await kvSet('img:' + G.sess.uid + ':' + name, e).catch(() => {});
  }
  const u = new Uint8Array(e);
  return (IMGU[name] = URL.createObjectURL(
    new Blob([u.slice(1)], { type: MIMES[u[0]] || 'image/jpeg' })
  ));
}
async function uploadPending() {
  for (const name of [...G.pend]) {
    const e = await kvGet('img:' + G.sess.uid + ':' + name);
    if (!e) {
      G.pend.delete(name);
      continue;
    }
    const r = await sto('object/plan-images/' + G.sess.uid + '/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: e
    });
    if (!r.ok) {
      let j = null;
      try {
        j = await r.json();
      } catch (x) {}
      if (!(j && (String(j.statusCode) === '409' || j.error === 'Duplicate')))
        throw { http: r.status, msg: (j && j.message) || '' };
    }
    G.pend.delete(name);
    await kvSet('pend:' + G.sess.uid, [...G.pend]);
  }
}
const imgDataUrl = async name => {
  const bl = await (await fetch(await loadImg(name))).blob();
  return new Promise(r => {
    const f = new FileReader();
    f.onload = () => r(f.result);
    f.readAsDataURL(bl);
  });
};
async function storeInlineBooks(bs) {
  let ch = false;
  for (const b of bs) if (await storeInline(b.tabs)) ch = true;
  return ch;
}
async function storeInline(tabs) {
  let ch = false;
  const walk = async bl => {
    for (const b of bl) {
      if (b.t === 'img' && /^data:image\//.test(b.src || '')) {
        try {
          const m = b.src.match(/^data:(image\/[a-z+.-]+);base64,(.*)$/i),
            body = unb64(m[2]),
            tag = /webp/i.test(m[1]) ? 1 : /png/i.test(m[1]) ? 3 : 2,
            name = newName(),
            e = await imgPack(tag, body);
          await kvSet('img:' + G.sess.uid + ':' + name, e.buffer);
          G.pend.add(name);
          IMGU[name] = URL.createObjectURL(new Blob([body], { type: m[1] }));
          b.src = name;
          ch = true;
        } catch (e) {}
      }
      if (b.items) await walk(b.items);
    }
  };
  for (const t of tabs) await walk(t.blocks);
  if (ch) await kvSet('pend:' + G.sess.uid, [...G.pend]);
  return ch;
}
async function cleanImages() {
  const used = new Set(),
    walk = bl =>
      bl.forEach(b => {
        if (b.t === 'img' && b.src) used.add(b.src);
        if (b.items) walk(b.items);
      });
  S.books.forEach(bk => bk.tabs.forEach(t => walk(t.blocks)));
  const r = await sto('object/list/plan-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: G.sess.uid, limit: 1000, offset: 0 })
  });
  if (!r.ok) throw { http: r.status };
  const names = (await r.json()).map(x => x.name).filter(n => n && !used.has(n) && !G.pend.has(n));
  if (!names.length) return 0;
  const d = await sto('object/plan-images', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: names.map(n => G.sess.uid + '/' + n) })
  });
  if (!d.ok) throw { http: d.status };
  for (const n of names) {
    delete IMGU[n];
    kvSet('img:' + G.sess.uid + ':' + n, null).catch(() => {});
  }
  return names.length;
}
