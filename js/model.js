/* Модель данных: книги, вкладки, шаблон новой книги и проверка корректности данных. */
const defaultTabs = () => [
  {
    name: 'Сюжет',
    blocks: [
      { id: uid(), t: 'h', lv: 1, x: 'Название книги' },
      { id: uid(), t: 'p', x: 'Коротко: о чём эта история?' },
      { id: uid(), t: 'warn', y: 'w', x: 'Не забыть: связать завязку с финалом.' }
    ]
  },
  {
    name: 'Герои',
    blocks: [
      {
        id: uid(),
        t: 'cards',
        cards: [
          { a: 'Главный герой', b: 'Цель, страх, характер…' },
          { a: 'Антагонист', b: 'Что им движет?' }
        ]
      }
    ]
  }
];
const MAX_BOOKS = 30; /* предел количества книг на аккаунт */
const newBook = (name, tpl) => {
  const tabs =
    tpl === false ? [{ name: 'Сюжет', blocks: [{ id: uid(), t: 'p', x: '' }] }] : defaultTabs();
  if (tpl !== false && tabs[0] && tabs[0].blocks[0]) tabs[0].blocks[0].x = esc(name);
  return { id: 'b' + uid(), name, tabs };
};
const tabOk = x => x && typeof x.name === 'string' && Array.isArray(x.blocks);
const bookOk = b =>
  b &&
  typeof b.id === 'string' &&
  typeof b.name === 'string' &&
  Array.isArray(b.tabs) &&
  b.tabs.length &&
  b.tabs.every(tabOk);
const booksOf = d =>
  d && Array.isArray(d.books) && d.books.length
    ? d.books
    : d && Array.isArray(d.tabs) && d.tabs.length
      ? [{ id: 'b1', name: 'Моя книга', tabs: d.tabs }]
      : null;
