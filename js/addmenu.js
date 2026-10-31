/* Меню «+» для добавления новых блоков и вставки изображений. */
const NEW = {
  h: () => ({ t: 'h', lv: 2, x: '' }),
  p: () => ({ t: 'p', x: '' }),
  table: () => ({
    t: 'table',
    rows: [
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ]
  }),
  warn: () => ({ t: 'warn', y: 'w', x: '' }),
  cards: () => ({
    t: 'cards',
    cards: [
      { a: '', b: '' },
      { a: '', b: '' }
    ]
  })
};
const pl = document.getElementById('plus'),
  pp = document.getElementById('pp');
const closePP = () => pp.classList.remove('open');
pl.onclick = () => pp.classList.toggle('open');
document.addEventListener('click', ev => {
  if (!ev.target.closest('#plus,#pp')) closePP();
});
[
  ['h', 'Заголовок'],
  ['p', 'Текст'],
  ['table', 'Таблица'],
  ['warn', 'Плашка'],
  ['cards', 'Карточки']
].forEach(([k, l]) =>
  pp.append(
    h(
      'button',
      {
        on: {
          click: () => {
            const b = NEW[k]();
            b.id = uid();
            S.tabs[S.active].blocks.push(b);
            closePP();
            upd();
            window.scrollTo(0, document.body.scrollHeight);
          }
        }
      },
      l
    )
  )
);
const fi = h('input', { type: 'file', accept: 'image/*', hidden: true });
document.body.append(fi);
fi.onchange = () => {
  const f = fi.files[0];
  fi.value = '';
  if (f) addImg(f);
};
pp.append(
  h(
    'button',
    {
      on: {
        click: () => {
          closePP();
          fi.click();
        }
      }
    },
    '🖼 Изображение'
  )
);
