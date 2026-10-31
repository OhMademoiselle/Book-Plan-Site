/* Таблицы: выделение ячеек, копирование и вставка, изменение размера, меню строк и столбцов. */
/* ширина столбцов таблицы */
function rsz(b, t, cols, W, i) {
  const g = h('span', { class: 'rs', title: 'Потяните, чтобы изменить ширину столбца' });
  g.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    g.setPointerCapture(ev.pointerId);
    const x0 = ev.clientX,
      tw = t.offsetWidth,
      a = W[i],
      c = W[i + 1],
      N = W.slice();
    let moved = false;
    const mv = e => {
      const d = Math.max(6 - a, Math.min(c - 6, ((e.clientX - x0) / tw) * 100));
      if (Math.abs(e.clientX - x0) > 1) moved = true;
      N[i] = a + d;
      N[i + 1] = c - d;
      cols[i].style.width = N[i] + '%';
      cols[i + 1].style.width = N[i + 1] + '%';
    };
    const up = () => {
      g.removeEventListener('pointermove', mv);
      g.removeEventListener('pointerup', up);
      g.removeEventListener('pointercancel', up);
      if (moved) {
        b.w = N.map(v => Math.round(v * 10) / 10);
        upd();
      }
    };
    g.addEventListener('pointermove', mv);
    g.addEventListener('pointerup', up);
    g.addEventListener('pointercancel', up);
  });
  return g;
}
function rszRow(b, tr, ri) {
  const g = h('span', {
    class: 'rsr',
    title: 'Потяните, чтобы изменить высоту строки (двойной щелчок — вернуть автоматическую)'
  });
  g.addEventListener('dblclick', () => {
    if (b.h && b.h[ri]) {
      b.h[ri] = 0;
      upd();
    }
  });
  g.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    try {
      g.setPointerCapture(ev.pointerId);
    } catch (e) {}
    const y0 = ev.clientY,
      h0 = tr.offsetHeight;
    let nh = h0,
      moved = false;
    const mv = e => {
      const d = e.clientY - y0;
      if (Math.abs(d) > 1) moved = true;
      nh = Math.max(30, Math.min(800, h0 + d));
      tr.style.height = nh + 'px';
    };
    const up = () => {
      g.removeEventListener('pointermove', mv);
      g.removeEventListener('pointerup', up);
      g.removeEventListener('pointercancel', up);
      if (moved) {
        const a = (b.h || []).slice();
        while (a.length < b.rows.length) a.push(0);
        a[ri] = Math.round(nh);
        b.h = a;
        upd();
      }
    };
    g.addEventListener('pointermove', mv);
    g.addEventListener('pointerup', up);
    g.addEventListener('pointercancel', up);
  });
  return g;
}
/* ячейки таблиц: выделение диапазона, копирование и вставка */
let CS = null,
  CLIP = null,
  CDRAG = null,
  ANCH = null,
  TCNT = 1;
const plural = (n, f) => {
  const a = n % 10,
    b = n % 100;
  return a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2];
};
const cellMulti = () => CS && (CS.r0 !== CS.r1 || CS.c0 !== CS.c1);
const norm = () => ({
  r0: Math.min(CS.r0, CS.r1),
  r1: Math.max(CS.r0, CS.r1),
  c0: Math.min(CS.c0, CS.c1),
  c1: Math.max(CS.c0, CS.c1)
});
const repaintAll = () => document.querySelectorAll('.tw').forEach(x => x._paint && x._paint());
const ctext = x => {
  const d = document.createElement('div');
  d.innerHTML = san(x || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n');
  return d.textContent.replace(/\n+$/, '');
};
const toTSV = rows =>
  rows
    .map(r => r.map(v => (/[\t\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)).join('\t'))
    .join('\n');
function parseTSV(t) {
  t = t.replace(/\r\n?/g, '\n');
  const rows = [];
  let row = [],
    cur = '',
    q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"' && cur === '') q = true;
    else if (ch === '\t') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else cur += ch;
  }
  if (cur !== '' || row.length || !rows.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}
function tableSel(tw, t, b) {
  const trs = () => [...t.querySelectorAll('tr')],
    pos = cell => {
      const tr = cell.parentElement;
      return [trs().indexOf(tr), [...tr.children].indexOf(cell)];
    };
  tw._paint = () => {
    const k = CS && CS.b === b ? norm() : null;
    trs().forEach((tr, ri) =>
      [...tr.children].forEach((c, ci) =>
        c.classList.toggle('csel', !!k && ri >= k.r0 && ri <= k.r1 && ci >= k.c0 && ci <= k.c1)
      )
    );
  };
  tw.addEventListener('mousedown', ev => {
    if (ev.button !== 0 || !S.edit) return;
    const cell = ev.target.closest('td,th');
    if (!cell || !t.contains(cell) || ev.target.closest('.rs,.dh')) return;
    const [r, c] = pos(cell);
    if (ev.shiftKey && ANCH && ANCH.b === b) {
      ev.preventDefault();
      CS = { b, r0: ANCH.r, c0: ANCH.c, r1: r, c1: c };
      getSelection().removeAllRanges();
      repaintAll();
      return;
    }
    ANCH = { b, r, c };
    if (CS) {
      CS = null;
      repaintAll();
    }
    CDRAG = { tw, b, r0: r, c0: c, pos };
  });
  tw.addEventListener('paste', ev => pasteCells(ev, b, pos), true);
  tw.addEventListener('keydown', ev => cellNav(ev, t, pos));
  tw.addEventListener('contextmenu', ev => {
    if (
      !S.edit ||
      document.body.classList.contains('mm') ||
      (window.matchMedia && !matchMedia('(pointer:fine)').matches)
    )
      return;
    const cell = ev.target.closest('td,th');
    if (!cell || !t.contains(cell)) return;
    ev.preventDefault();
    const [r, c] = pos(cell);
    let rg = null;
    if (cellMulti() && CS.b === b) {
      const k = norm();
      if (r >= k.r0 && r <= k.r1 && c >= k.c0 && c <= k.c1) rg = k;
    }
    if (!rg) {
      rg = { r0: r, r1: r, c0: c, c1: c };
      CS = { b, r0: r, c0: c, r1: r, c1: c };
      repaintAll();
    }
    showCM(ev.clientX, ev.clientY, b, rg);
  });
}
document.addEventListener('mousemove', ev => {
  if (!CDRAG || ev.buttons !== 1) return;
  const el = document.elementFromPoint(ev.clientX, ev.clientY),
    c = el && el.closest && el.closest('td,th');
  if (!c || !CDRAG.tw.contains(c)) return;
  const [r, ci] = CDRAG.pos(c);
  if (!CS && r === CDRAG.r0 && ci === CDRAG.c0) return;
  CS = { b: CDRAG.b, r0: CDRAG.r0, c0: CDRAG.c0, r1: r, c1: ci };
  CDRAG.tw.classList.add('sel-mode');
  getSelection().removeAllRanges();
  CDRAG.tw._paint();
});
document.addEventListener('mouseup', () => {
  if (CDRAG) {
    CDRAG.tw.classList.remove('sel-mode');
    CDRAG = null;
  }
});
document.addEventListener('mousedown', ev => {
  if (CS && !ev.target.closest('td,th')) {
    CS = null;
    repaintAll();
  }
});
function cellCopy(e, cut) {
  if (!cellMulti()) return;
  const { r0, r1, c0, c1 } = norm(),
    b = CS.b,
    rows = [];
  for (let r = r0; r <= r1; r++) rows.push(b.rows[r].slice(c0, c1 + 1));
  CLIP = { tsv: toTSV(rows.map(r => r.map(ctext))), rows: JSON.parse(JSON.stringify(rows)) };
  e.clipboardData.setData('text/plain', CLIP.tsv);
  e.clipboardData.setData(
    'text/html',
    '<table>' +
      rows.map(r => '<tr>' + r.map(x => '<td>' + x + '</td>').join('') + '</tr>').join('') +
      '</table>'
  );
  e.preventDefault();
  const n = rows.length * (c1 - c0 + 1);
  if (cut) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) b.rows[r][c] = '';
    CS = null;
    upd();
    toast('Вырезано ячеек: ' + n);
  } else toast('Скопировано ячеек: ' + n);
}
document.addEventListener('copy', e => cellCopy(e, false));
document.addEventListener('cut', e => cellCopy(e, true));
function pasteCells(ev, b, pos) {
  const txt = ev.clipboardData.getData('text/plain');
  if (txt === '') return;
  const cell = ev.target.closest && ev.target.closest('td,th');
  if (!cell) return;
  const html = ev.clipboardData.getData('text/html'),
    own = CLIP && CLIP.tsv === txt,
    isGrid = own || txt.indexOf('\t') >= 0 || /<table/i.test(html),
    sel = cellMulti() && CS.b === b;
  if (!isGrid && !sel) return;
  const grid = own ? CLIP.rows : isGrid ? parseTSV(txt).map(r => r.map(esc)) : [[esc(txt)]],
    multi = grid.length > 1 || grid[0].length > 1;
  if (!multi && !sel) return;
  ev.preventDefault();
  ev.stopPropagation();
  if (!multi) {
    const { r0, r1, c0, c1 } = norm();
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) b.rows[r][c] = grid[0][0];
    CS = null;
    upd();
    toast('Значение вставлено в выделенные ячейки');
    return;
  }
  let r0, c0;
  if (sel) {
    ({ r0, c0 } = norm());
  } else {
    [r0, c0] = pos(cell);
  }
  const w = Math.max(...grid.map(r => r.length)),
    needR = r0 + grid.length,
    needC = c0 + w,
    n = b.rows[0].length;
  if (needC > 30) {
    toast('Максимум 30 столбцов — вставка не выполнена');
    return;
  }
  if (needR > 500) {
    toast('Максимум 500 строк — вставка не выполнена');
    return;
  }
  const grow = needR > b.rows.length || needC > n;
  while (b.rows.length < needR) b.rows.push(Array(Math.max(n, needC)).fill(''));
  if (needC > n) {
    b.rows.forEach(r => {
      while (r.length < needC) r.push('');
    });
    b.w = null;
  }
  grid.forEach((row, i) =>
    row.forEach((v, j) => {
      b.rows[r0 + i][c0 + j] = v;
    })
  );
  CS = null;
  upd();
  toast('Вставлено ячеек: ' + grid.length * w + (grow ? ' (таблица расширена)' : ''));
}
document.addEventListener('keydown', ev => {
  if (!cellMulti()) return;
  if (ev.key === 'Escape') {
    CS = null;
    repaintAll();
    return;
  }
  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    ev.preventDefault();
    const { r0, r1, c0, c1 } = norm(),
      b = CS.b;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) b.rows[r][c] = '';
    CS = null;
    upd();
  }
});
/* стрелки: переход между ячейками */
function placeCaret(e, how, x, y) {
  const s = getSelection();
  let r = null;
  if ((how === 'up' || how === 'down') && x != null) {
    if (document.caretRangeFromPoint) {
      r = document.caretRangeFromPoint(x, y);
      if (r && !e.contains(r.startContainer)) r = null;
    } else if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (p && e.contains(p.offsetNode)) {
        r = document.createRange();
        r.setStart(p.offsetNode, p.offset);
        r.collapse(true);
      }
    }
  }
  if (!r) {
    r = document.createRange();
    r.selectNodeContents(e);
    r.collapse(!(how === 'end' || how === 'up'));
  }
  s.removeAllRanges();
  s.addRange(r);
}
function cellNav(ev, t, pos) {
  if (ev.isComposing || ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const k = ev.key;
  if (!/^Arrow(Left|Right|Up|Down)$/.test(k)) return;
  const e = ev.target.closest && ev.target.closest('.ed');
  if (!e) return;
  const cell = e.closest('td,th');
  if (!cell || !t.contains(cell)) return;
  const s = getSelection();
  if (!s.rangeCount || !s.isCollapsed) return;
  const rg = s.getRangeAt(0),
    bef = document.createRange(),
    aft = document.createRange();
  bef.selectNodeContents(e);
  bef.setEnd(rg.startContainer, rg.startOffset);
  aft.selectNodeContents(e);
  aft.setStart(rg.endContainer, rg.endOffset);
  const [r, c] = pos(cell),
    rows = [...t.querySelectorAll('tr')];
  let tr = r,
    tc = c,
    how = 'start',
    x = null;
  if (k === 'ArrowLeft') {
    if (bef.toString() !== '') return;
    tc = c - 1;
    how = 'end';
  } else if (k === 'ArrowRight') {
    if (aft.toString() !== '') return;
    tc = c + 1;
    how = 'start';
  } else {
    const cs = getComputedStyle(e),
      lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5,
      box = e.getBoundingClientRect();
    let rc = (rg.getClientRects && rg.getClientRects()[0]) || null;
    if (!rc || (!rc.width && !rc.height))
      rc = rg.getBoundingClientRect ? rg.getBoundingClientRect() : null;
    const have = rc && rc.height > 0;
    if (have) x = rc.left;
    if (k === 'ArrowUp') {
      if (have && rc.top > box.top + (parseFloat(cs.paddingTop) || 0) + lh * 0.6) return;
      tr = r - 1;
      how = 'up';
    } else {
      if (have && rc.bottom < box.bottom - (parseFloat(cs.paddingBottom) || 0) - lh * 0.6) return;
      tr = r + 1;
      how = 'down';
    }
  }
  const row = rows[tr],
    cell2 = row && row.children[tc],
    e2 = cell2 && cell2.querySelector('.ed');
  if (!e2) return;
  ev.preventDefault();
  if (CS) {
    CS = null;
    repaintAll();
  }
  e2.focus();
  const b2 = e2.getBoundingClientRect(),
    c2 = getComputedStyle(e2),
    lh2 = parseFloat(c2.lineHeight) || 24;
  placeCaret(
    e2,
    how,
    x,
    how === 'up'
      ? b2.bottom - (parseFloat(c2.paddingBottom) || 0) - lh2 / 2
      : b2.top + (parseFloat(c2.paddingTop) || 0) + lh2 / 2
  );
}
/* правая кнопка: удаление ячеек, столбцов и строк */
let CM = null;
function closeCM() {
  if (CM) {
    CM.remove();
    CM = null;
  }
}
function showCM(x, y, b, rg) {
  closeCM();
  const n = b.rows[0].length,
    R = b.rows.length,
    nr = rg.r1 - rg.r0 + 1,
    nc = rg.c1 - rg.c0 + 1,
    single = nr * nc === 1,
    done = () => {
      CS = null;
      upd();
    };
  const it = (l, f, dis) =>
    h(
      'button',
      {
        class: 'cmi' + (/^Удалить/.test(l) ? ' dng' : ''),
        disabled: !!dis,
        on: {
          click: () => {
            closeCM();
            f();
          }
        }
      },
      l
    );
  const els = [
    it(single ? 'Очистить ячейку' : 'Очистить ячейки (' + nr * nc + ')', () => {
      for (let r = rg.r0; r <= rg.r1; r++) for (let c = rg.c0; c <= rg.c1; c++) b.rows[r][c] = '';
      done();
    }),
    h('hr')
  ];
  if (single)
    els.push(
      it('Удалить ячейку, сдвинув влево', () => {
        b.rows[rg.r0].splice(rg.c0, 1);
        b.rows[rg.r0].push('');
        done();
      }),
      it('Удалить ячейку, сдвинув вверх', () => {
        for (let i = rg.r0; i < R - 1; i++) b.rows[i][rg.c0] = b.rows[i + 1][rg.c0];
        b.rows[R - 1][rg.c0] = '';
        done();
      }),
      h('hr')
    );
  els.push(
    it(
      'Удалить ' + (nc > 1 ? nc + ' ' : '') + plural(nc, ['столбец', 'столбца', 'столбцов']),
      () => {
        b.rows.forEach(row => row.splice(rg.c0, nc));
        if (b.w && b.w.length === n) {
          b.w.splice(rg.c0, nc);
          const sm = b.w.reduce((a, v) => a + v, 0) || 1;
          b.w = b.w.map(v => Math.round((v / sm) * 1000) / 10);
        }
        done();
      },
      nc >= n
    ),
    it(
      'Удалить ' + (nr > 1 ? nr + ' ' : '') + plural(nr, ['строку', 'строки', 'строк']),
      () => {
        b.rows.splice(rg.r0, nr);
        if (b.h) b.h.splice(rg.r0, nr);
        done();
      },
      nr >= R
    )
  );
  CM = h('div', { class: 'cmenu' }, ...els);
  document.body.append(CM);
  CM.style.left = Math.max(4, Math.min(x, innerWidth - CM.offsetWidth - 8)) + 'px';
  CM.style.top = Math.max(4, Math.min(y, innerHeight - CM.offsetHeight - 8)) + 'px';
}
document.addEventListener(
  'mousedown',
  ev => {
    if (CM && !CM.contains(ev.target)) closeCM();
  },
  true
);
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') closeCM();
});
window.addEventListener('scroll', closeCM, true);
window.addEventListener('resize', closeCM);
