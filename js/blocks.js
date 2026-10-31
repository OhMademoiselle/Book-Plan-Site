/* Блоки: общие элементы (редактируемое поле, кнопка удаления) и отрисовка каждого типа блока. */
const ed = (o, k, cls, ph, tag = 'div') => {
  const e = h(tag, {
    class: 'ed ' + cls,
    contenteditable: S.edit ? 'true' : 'false',
    'data-ph': ph,
    on: {
      input: () => {
        PEND = null;
        fixSize(e);
        if (!e.textContent.trim() && !e.querySelector('ul,ol')) e.innerHTML = '';
        o[k] = e.innerHTML;
        touch();
      },
      paste: ev => pasteRich(ev),
      copy: ev => copyRich(ev, e, false),
      cut: ev => copyRich(ev, e, true)
    }
  });
  e.innerHTML = san(o[k]);
  return e;
};
const delBtn = (fn, l = '✕') => {
  const b = h('button', { class: 'del', title: 'Удалить' }, l);
  let t;
  b.onclick = () => {
    if (b.dataset.s) {
      clearTimeout(t);
      fn();
    } else {
      b.dataset.s = 1;
      b.textContent = 'Удалить?';
      b.classList.add('sure');
      t = setTimeout(() => {
        delete b.dataset.s;
        b.textContent = l;
        b.classList.remove('sure');
      }, 2500);
    }
  };
  return b;
};
const sel = (opts, val, fn) => {
  const s = h(
    'select',
    { on: { change: () => fn(s.value) } },
    opts.map(([v, l]) => h('option', { value: v }, l))
  );
  s.value = val;
  return s;
};
const WT = { w: ['⚠️', 'Внимание'], r: ['⛔', 'Важно'], i: ['💡', 'Идея'], o: ['✅', 'Готово'] };
const R = {
  h: b =>
    h(
      'div',
      { class: 'hrow' },
      sel(
        [
          [1, 'H1'],
          [2, 'H2'],
          [3, 'H3']
        ],
        b.lv,
        v => {
          b.lv = +v;
          upd();
        }
      ),
      ed(b, 'x', 'h' + b.lv, 'Заголовок')
    ),
  p: b => ed(b, 'x', '', 'Пишите текст здесь…'),
  warn: b =>
    h(
      'div',
      {},
      sel(
        Object.entries(WT).map(([k, v]) => [k, v[1]]),
        b.y,
        v => {
          b.y = v;
          upd();
        }
      ),
      h(
        'div',
        { class: 'warn w-' + b.y },
        h('span', { class: 'ico' }, WT[b.y][0]),
        ed(b, 'x', '', 'Текст плашки…')
      )
    ),
  table: b => {
    const n = b.rows[0].length,
      W = b.w && b.w.length === n ? b.w.slice() : Array(n).fill(100 / n);
    const cols = W.map(x => h('col', { style: 'width:' + x + '%' })),
      t = h('table', {}, h('colgroup', {}, cols));
    b.rows.forEach((r, ri) => {
      const tr = h('tr', {});
      if (b.h && b.h[ri] > 0) tr.style.height = b.h[ri] + 'px';
      r.forEach((_, ci) => {
        const c = h(ri ? 'td' : 'th', {}, ed(r, ci, '', ri ? '' : 'Заголовок'));
        if (ci < n - 1) c.append(rsz(b, t, cols, W, ci));
        c.append(rszRow(b, tr, ri));
        if (!ri && n > 1) {
          const g = dh(b, ci, c);
          g.classList.add('ch');
          g.title = 'Перетащите, чтобы переставить столбец';
          c.append(g);
          cdnd(c, b, ci, n);
        }
        if (!ci && ri) {
          const g = dh(b.rows, ri, tr);
          g.classList.add('rh');
          c.append(g);
          dnd(tr, b.rows, ri, false, () => b.h);
        }
        tr.append(c);
      });
      t.append(tr);
    });
    const nIn = h('input', {
      type: 'number',
      min: 1,
      max: 50,
      value: TCNT,
      class: 'cnt',
      title: 'Сколько строк или столбцов добавить или убрать за раз'
    });
    const mk = (sg, kind, fn) => {
      const bt = h('button', { class: 'add' });
      const setLab = () => {
        const k = Math.max(1, Math.min(50, parseInt(nIn.value) || 1));
        bt.textContent =
          sg +
          ' ' +
          k +
          ' ' +
          (kind === 'r'
            ? plural(k, ['строка', 'строки', 'строк'])
            : plural(k, ['столбец', 'столбца', 'столбцов']));
        return k;
      };
      setLab();
      nIn.addEventListener('input', setLab);
      bt.onclick = () => {
        const k = setLab();
        TCNT = k;
        fn(k);
        upd();
      };
      return bt;
    };
    const tw = h('div', { class: 'tw' }, t);
    tableSel(tw, t, b);
    return h(
      'div',
      {},
      tw,
      h(
        'div',
        { class: 'bar' },
        h('label', { class: 'cntl' }, 'Количество:', nIn),
        mk('+', 'r', k => {
          const kk = Math.min(k, 500 - b.rows.length);
          if (kk < 1) {
            toast('Максимум 500 строк');
            return;
          }
          for (let i = 0; i < kk; i++) b.rows.push(Array(n).fill(''));
        }),
        mk('+', 'c', k => {
          const kk = Math.min(k, 30 - n);
          if (kk < 1) {
            toast('Максимум 30 столбцов');
            return;
          }
          b.rows.forEach(r => {
            for (let i = 0; i < kk; i++) r.push('');
          });
          b.w = null;
        }),
        mk('−', 'r', k => {
          b.rows.length = Math.max(1, b.rows.length - k);
          if (b.h) b.h.length = Math.min(b.h.length, b.rows.length);
        }),
        mk('−', 'c', k => {
          const keep = Math.max(1, n - k);
          b.rows.forEach(r => {
            r.length = keep;
          });
          b.w = null;
        })
      )
    );
  },
  cards: b => {
    const g = h('div', { class: 'grid' });
    b.cards.forEach((c, i) => {
      const cd = h(
        'div',
        { class: 'card' },
        h(
          'div',
          { class: 'cx' },
          delBtn(() => {
            b.cards.splice(i, 1);
            upd();
          })
        ),
        ed(c, 'a', 'ct', 'Название'),
        ed(c, 'b', 'cb', 'Описание…'),
        attrsUI(b, c, i)
      );
      cd.firstChild.prepend(dh(b.cards, i, cd));
      dnd(cd, b.cards, i, true);
      g.append(cd);
    });
    return h(
      'div',
      {},
      g,
      h(
        'div',
        { class: 'bar' },
        h(
          'button',
          {
            class: 'add',
            on: {
              click: () => {
                b.cards.push({ a: '', b: '' });
                upd();
              }
            }
          },
          '+ Карточка'
        )
      )
    );
  }
};
function mv(list, i, d) {
  const j = i + d;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  upd();
}
function findBlock(bl, id, anc = []) {
  for (const b of bl) {
    if (b.id === id) return anc;
    if (b.t === 'group') {
      const r = findBlock(b.items, id, [...anc, b]);
      if (r) return r;
    }
  }
  return null;
}
function dissolve(g) {
  S.tabs.forEach(t => {
    const k = t.blocks.indexOf(g);
    if (k >= 0) t.blocks.splice(k, 1, ...g.items);
  });
}
function blockEl(list, i, grp) {
  const b = list[i],
    top = !grp;
  const tb = h('div', { class: 'tools' });
  const s = h(
    'section',
    {
      class:
        'blk' +
        (top ? ' top' : '') +
        (MM && MM.includes(b.id) ? ' picked' : '') +
        (b.a ? ' anc' : ''),
      'data-id': b.id,
      tabindex: '-1'
    },
    tb
  );
  const ib = (ic, t, f, dis) => {
    const x = h('button', { class: 'ib', title: t, disabled: !!dis, on: { click: f } });
    x.innerHTML = ic;
    return x;
  };
  const g = dh(list, i, s);
  g.classList.add('ib');
  g.innerHTML = IC.grip;
  g.title = 'Перетащите, чтобы переставить блок';
  const acts = [
    ib(IC.copy, 'Дублировать блок (копия появится ниже)', () => {
      list.splice(i + 1, 0, clone(b));
      upd();
    }),
    ib(IC.clip, 'Скопировать содержимое блока в буфер обмена', () => copyBlock(b))
  ];
  if (b.t === 'group')
    acts.push(
      ib(IC.split, 'Разъединить группу на отдельные блоки', () => {
        dissolve(b);
        upd();
      })
    );
  acts.push(
    trashBtn(() => {
      list.splice(i, 1);
      if (grp && grp.items.length < 2) dissolve(grp);
      upd();
    })
  );
  tb.append(
    h(
      'div',
      { class: 'tp' + (b.t === 'group' ? ' g4' : '') },
      g,
      ib(IC.up, 'Вверх', () => mv(list, i, -1), i === 0),
      ib(IC.down, 'Вниз', () => mv(list, i, 1), i === list.length - 1),
      ...acts
    ),
    h(
      'label',
      { class: 'anc-l', title: 'Якорь: на этот блок можно будет сделать ссылку' },
      h('input', {
        type: 'checkbox',
        checked: !!b.a,
        on: {
          change: e => {
            b.a = e.target.checked;
            upd();
          }
        }
      }),
      '⚓ Якорь'
    )
  );
  dnd(s, list, i, false);
  if (top && b.t !== 'h')
    s.append(
      h(
        'button',
        {
          class: 'fold',
          title: b.c ? 'Развернуть' : 'Свернуть',
          on: {
            click: () => {
              b.c = !b.c;
              upd();
            }
          }
        },
        b.c ? '▸' : '▾'
      )
    );
  s.append(
    b.c && top && b.t !== 'group'
      ? h(
          'div',
          {
            class: 'sum',
            title: 'Развернуть',
            on: {
              click: () => {
                b.c = false;
                upd();
              }
            }
          },
          lab(b)
        )
      : R[b.t](b)
  );
  return s;
}
R.group = b => {
  const w = h('div', { class: 'grp' });
  b.items.forEach((_, i) => {
    if (!(b.c && i)) w.append(blockEl(b.items, i, b));
  });
  if (b.c && b.items.length > 1)
    w.append(h('div', { class: 'more' }, 'Свёрнуто, скрыто блоков: ' + (b.items.length - 1)));
  return w;
};
R.img = b => {
  const wrap = h('div', { class: 'iwrap' }),
    im = h('img', { alt: b.x ? plain(b.x) : 'Изображение', draggable: false });
  wrap.style.width = Math.min(100, Math.max(10, b.iw || 100)) + '%';
  if (b.ar) im.style.aspectRatio = String(b.ar);
  const src = b.src || '';
  if (/^(data|blob):/.test(src)) im.src = src;
  else if (src)
    loadImg(src)
      .then(u => {
        im.src = u;
      })
      .catch(e => {
        wrap.replaceChildren(
          h(
            'div',
            { class: 'imgerr' },
            e && e.net
              ? 'Нет связи: изображение появится, когда связь вернётся.'
              : 'Изображение не загрузилось. Обновите страницу или проверьте подключение.'
          )
        );
      });
  const hd = h('span', {
    class: 'irs',
    title: 'Потяните, чтобы изменить размер (двойной щелчок — на всю ширину)'
  });
  hd.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    try {
      hd.setPointerCapture(ev.pointerId);
    } catch (e) {}
    const box = wrap.parentElement.getBoundingClientRect().width || wrap.offsetWidth || 1,
      x0 = ev.clientX,
      w0 = wrap.getBoundingClientRect().width;
    let pct = b.iw || 100,
      moved = false;
    const mv = e => {
      const nw = Math.max(box * 0.1, Math.min(box, w0 + (e.clientX - x0) * 2));
      pct = Math.round((nw / box) * 1000) / 10;
      if (Math.abs(e.clientX - x0) > 1) moved = true;
      wrap.style.width = pct + '%';
    };
    const up = () => {
      hd.removeEventListener('pointermove', mv);
      hd.removeEventListener('pointerup', up);
      hd.removeEventListener('pointercancel', up);
      if (moved) {
        b.iw = pct;
        upd();
      }
    };
    hd.addEventListener('pointermove', mv);
    hd.addEventListener('pointerup', up);
    hd.addEventListener('pointercancel', up);
  });
  hd.addEventListener('dblclick', () => {
    b.iw = 100;
    upd();
  });
  wrap.append(im, hd);
  return h('div', { class: 'img' }, wrap, ed(b, 'x', 'cap', 'Подпись (необязательно)…'));
};
const IC = {
  clip: '<svg viewBox="0 0 16 16"><rect x="3.5" y="3" width="9" height="11" rx="1.5"/><path d="M6 3v-.6c0-.4.3-.7.7-.7h2.6c.4 0 .7.3.7.7V3M6 7h4M6 9.5h4M6 12h2.5"/></svg>',
  grip: '<svg viewBox="0 0 16 16"><circle class="f" cx="5.5" cy="3.5" r="1.2"/><circle class="f" cx="10.5" cy="3.5" r="1.2"/><circle class="f" cx="5.5" cy="8" r="1.2"/><circle class="f" cx="10.5" cy="8" r="1.2"/><circle class="f" cx="5.5" cy="12.5" r="1.2"/><circle class="f" cx="10.5" cy="12.5" r="1.2"/></svg>',
  up: '<svg viewBox="0 0 16 16"><path d="M3.5 10 8 5.5 12.5 10"/></svg>',
  down: '<svg viewBox="0 0 16 16"><path d="M3.5 6 8 10.5 12.5 6"/></svg>',
  copy: '<svg viewBox="0 0 16 16"><rect x="5.5" y="5.5" width="8" height="8" rx="1.8"/><path d="M10.5 3.5v-.2A1.3 1.3 0 0 0 9.2 2H3.8A1.8 1.8 0 0 0 2 3.8v5.4a1.3 1.3 0 0 0 1.3 1.3h.2"/></svg>',
  split:
    '<svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="4.5" rx="1.5"/><rect x="2.5" y="9" width="11" height="4.5" rx="1.5"/></svg>',
  trash:
    '<svg viewBox="0 0 16 16"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M7 7v4M9 7v4"/></svg>'
};
function trashBtn(fn) {
  const b = h('button', { class: 'ib del', title: 'Удалить блок' });
  b.innerHTML = IC.trash;
  let t;
  b.onclick = () => {
    if (b.dataset.s) {
      clearTimeout(t);
      fn();
    } else {
      b.dataset.s = 1;
      b.classList.add('sure');
      b.title = 'Нажмите ещё раз, чтобы удалить';
      t = setTimeout(() => {
        delete b.dataset.s;
        b.classList.remove('sure');
        b.title = 'Удалить блок';
      }, 2500);
    }
  };
  return b;
}
