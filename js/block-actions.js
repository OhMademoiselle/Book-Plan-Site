/* Действия над блоками и вкладками: копирование, очистка, дублирование. */
function blockText(b) {
  if (b.t === 'table')
    return {
      t: toTSV(b.rows.map(r => r.map(ctext))),
      h:
        '<table>' +
        b.rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') +
        '</table>'
    };
  if (b.t === 'cards')
    return {
      t: b.cards
        .map(
          c =>
            ctext(c.a) +
            (c.b ? '\n' + ctext(c.b) : '') +
            atList(c)
              .map(a => '\n' + ctext(a.k) + ': ' + ctext(a.v))
              .join('')
        )
        .join('\n\n'),
      h: b.cards
        .map(
          c =>
            '<p><b>' +
            c.a +
            '</b><br>' +
            c.b +
            atList(c)
              .map(a => '<br><i>' + a.k + ':</i> ' + a.v)
              .join('') +
            '</p>'
        )
        .join('')
    };
  if (b.t === 'group') {
    const p = b.items.map(blockText);
    return { t: p.map(x => x.t).join('\n\n'), h: p.map(x => x.h).join('') };
  }
  if (b.t === 'img') return { t: ctext(b.x), h: b.x ? '<p>' + b.x + '</p>' : '' };
  if (b.t === 'h') {
    const l = Math.min(3, Math.max(1, b.lv || 2));
    return { t: ctext(b.x), h: '<h' + l + '>' + b.x + '</h' + l + '>' };
  }
  return { t: ctext(b.x), h: '<div>' + b.x + '</div>' };
}
async function imgPng(b) {
  const src = /^(data|blob):/.test(b.src || '') ? b.src : await loadImg(b.src),
    bl = await (await fetch(src)).blob(),
    bmp = await createImageBitmap(bl),
    c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0);
  return new Promise(r => c.toBlob(r, 'image/png'));
}
async function copyBlock(b) {
  try {
    const bt = blockText(b);
    let png = null;
    if (b.t === 'img' && b.src && typeof ClipboardItem !== 'undefined') {
      try {
        png = await imgPng(b);
      } catch (e) {}
    }
    if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
      const d = {
        'text/plain': new Blob([bt.t], { type: 'text/plain' }),
        'text/html': new Blob([san(bt.h, 1)], { type: 'text/html' })
      };
      if (png) d['image/png'] = png;
      await navigator.clipboard.write([new ClipboardItem(d)]);
    } else await navigator.clipboard.writeText(bt.t);
    toast(b.t === 'img' && png ? 'Изображение скопировано' : 'Содержимое блока скопировано');
  } catch (e) {
    toast('Не удалось скопировать. Разрешите доступ к буферу обмена или попробуйте ещё раз.');
  }
}
function clearTab() {
  const t = S.tabs[S.active];
  if (!t.blocks.length) {
    toast('Вкладка уже пуста');
    return;
  }
  modal.replaceChildren(
    h(
      'div',
      { class: 'box' },
      h('h3', {}, 'Очистить вкладку «' + (t.name || 'Без названия') + '»?'),
      h(
        'p',
        {},
        'Будут удалены все блоки на этой вкладке (блоков: ' +
          t.blocks.length +
          '). Отменить это можно кнопкой ↶ на верхней панели, пока вы не сделаете больше пяти других действий.'
      ),
      h(
        'button',
        {
          class: 'it dng',
          on: {
            click: () => {
              t.blocks.splice(0);
              closeModal();
              upd();
              toast('Вкладка очищена');
            }
          }
        },
        'Очистить вкладку'
      ),
      h('button', { class: 'it', on: { click: closeModal } }, 'Отмена')
    )
  );
  modal.classList.add('on');
}
const clone = b => {
  const c = JSON.parse(JSON.stringify(b));
  const nid = x => {
    x.id = uid();
    (x.items || []).forEach(nid);
  };
  nid(c);
  return c;
};
