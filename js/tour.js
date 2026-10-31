/* Обучение для новых пользователей (пошаговый тур). */
let TOUR = null,
  TOUR_DELAY = 1200,
  TOUR_TIMER = null;
const TOUR_STEPS = [
  {
    t: 'Добро пожаловать! 👋',
    x: 'Это планировщик вашей книги: сюжет, герои, главы и заметки в одном месте. Покажу за минуту, как тут всё устроено. Обучение можно пропустить и запустить снова в «⚙ Настройки».',
    c: 1
  },
  {
    sel: '#bkc',
    t: 'Ваши книги',
    x: 'У каждой книги свои вкладки и свои записи. Здесь можно создать новую книгу, переименовать или удалить её и переключиться между книгами.'
  },
  {
    sel: '#tabs',
    t: 'Вкладки',
    x: 'Вкладки — это разделы книги: «Сюжет», «Герои» и любые другие. Нажмите, чтобы открыть. Двойной клик по открытой вкладке переименует её, а «+» в конце добавит новую. Колёсико мыши на вкладке откроет её в отдельном окне.'
  },
  {
    sel: '#mode',
    t: 'Правка и чтение',
    x: 'В режиме «Правка» можно менять текст и блоки. «Чтение» — только просмотр: так ничего не удалится случайно.'
  },
  {
    sel: '#plus',
    pp: 1,
    t: 'Добавляйте блоки',
    x: 'Кнопка «+» добавляет блок: заголовок, текст, таблицу, плашку для важных заметок, карточки (для героев, мест и т. п.: название, описание и свои атрибуты вроде возраста или роли) или изображение.'
  },
  {
    sel: '#ftog',
    t: 'Оформление текста',
    x: 'Здесь жирный и курсив, шрифт, размер, цвет, списки. Шрифт и размер можно выбрать ещё до того, как начнёте печатать. Ошиблись? Ctrl+Z вернёт действие назад.'
  },
  {
    sel: '#main',
    t: 'Ваши записи',
    x: 'Каждый блок — отдельный кусочек плана. Нажмите на текст, чтобы писать. За значок ⠿ блок можно перетащить и поменять порядок.'
  },
  {
    sel: '.sr',
    t: 'Поиск',
    x: 'Поиск ищет по всем вкладкам открытой книги: введите слово, и сайт покажет, где оно встречается.'
  },
  {
    sel: '#bk',
    t: 'Сохранение',
    x: 'Правки сохраняются в облако сами. Зелёный «Сохранено» значит, что всё в порядке. Нажмите на него, чтобы сохранить прямо сейчас.'
  },
  {
    sel: '#st',
    t: 'Настройки',
    x: 'Здесь темы оформления, смена пароля и почты, файл с резервной копией и кнопка, чтобы пройти это обучение заново.'
  },
  {
    t: 'Готово! 🎉',
    x: 'Совет: раз в пару недель скачивайте файл-копию (⚙ Настройки → Данные и облако). Сайт сам напомнит об этом. Приятной работы над книгой!',
    c: 1
  }
];
const tourKey = () => 'plan-knigi-tour:' + ((G.sess && G.sess.uid) || 'anon');
const tourDone = () => {
  try {
    return !!JSON.parse(localStorage.getItem(tourKey()) || 'null');
  } catch (e) {
    return false;
  }
};
const tourMark = skipped => {
  try {
    localStorage.setItem(tourKey(), JSON.stringify({ done: Date.now(), skipped: !!skipped }));
  } catch (e) {}
};
const tourRect = st => {
  const el = document.querySelector(st.sel);
  if (!el) return null;
  let r = el.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return null;
  if (st.pp) {
    const p = document.getElementById('pp');
    if (p && p.classList.contains('open')) {
      const q = p.getBoundingClientRect();
      if (q.width > 0)
        r = {
          left: Math.min(r.left, q.left),
          top: Math.min(r.top, q.top),
          right: Math.max(r.right, q.right),
          bottom: Math.max(r.bottom, q.bottom)
        };
    }
  }
  return {
    left: r.left,
    top: r.top,
    width: r.right != null ? r.right - r.left : r.width,
    height: r.bottom != null ? r.bottom - r.top : r.height
  };
};
function endTour(skipped, mark) {
  if (!TOUR) return;
  const T = TOUR;
  TOUR = null;
  document.removeEventListener('keydown', T.key, true);
  window.removeEventListener('resize', T.place);
  window.removeEventListener('scroll', T.place, true);
  T.root.remove();
  const p = document.getElementById('pp');
  if (p) p.classList.remove('open');
  if (mark !== false) tourMark(skipped);
}
function startTour() {
  if (TOUR) endTour(true, false);
  const steps = TOUR_STEPS.filter(
    st => st.c || (document.querySelector(st.sel) && tourRect({ sel: st.sel }))
  );
  if (steps.length < 3) return;
  const root = h('div', { id: 'tour', role: 'dialog', 'aria-live': 'polite' }),
    hole = h('div', { class: 'th' }),
    card = h('div', { class: 'tc' }),
    shield = h('div', { class: 'ts' });
  root.append(shield, hole, card);
  root.addEventListener('click', e => e.stopPropagation());
  document.body.append(root);
  const T = { i: 0, root };
  TOUR = T;
  const go = d => {
    const n = T.i + d;
    if (n < 0) return;
    if (n >= steps.length) {
      endTour(false);
      return;
    }
    T.i = n;
    show();
  };
  const place = () => {
    const st = steps[T.i];
    if (!st || TOUR !== T) return;
    root.classList.toggle('c', !!st.c);
    if (st.c) return;
    const r = tourRect(st);
    if (!r) {
      return;
    }
    const vw = innerWidth,
      vh = innerHeight,
      pad = 6;
    const top = Math.max(0, r.top - pad),
      bot = Math.min(vh, r.top + r.height + pad);
    hole.style.left = Math.max(0, r.left - pad) + 'px';
    hole.style.top = top + 'px';
    hole.style.width = Math.min(vw, r.width + 2 * pad) + 'px';
    hole.style.height = Math.max(10, bot - top) + 'px';
    const w = card.offsetWidth || 360,
      ch = card.offsetHeight || 180;
    let y;
    if (r.height > vh * 0.55) y = vh - ch - 14;
    else if (r.top + r.height + ch + 18 < vh) y = r.top + r.height + pad + 10;
    else if (r.top - ch - 18 > 0) y = r.top - ch - pad - 10;
    else y = Math.max(12, vh - ch - 12);
    card.style.top = Math.max(8, y) + 'px';
    card.style.left =
      Math.min(Math.max(12, r.left + r.width / 2 - w / 2), Math.max(12, vw - w - 12)) + 'px';
  };
  T.place = place;
  const show = () => {
    const st = steps[T.i],
      last = T.i === steps.length - 1,
      first = T.i === 0;
    const p = document.getElementById('pp');
    if (p) p.classList.remove('open');
    if (st.pp && p) p.classList.add('open');
    card.replaceChildren(
      h('h4', {}, st.t),
      h('p', {}, st.x),
      h(
        'div',
        { class: 'tp' },
        h('span', {}, 'Шаг ' + (T.i + 1) + ' из ' + steps.length),
        h(
          'span',
          { class: 'tdots' },
          ...steps.map((_, k) => h('i', { class: k === T.i ? 'on' : '' }))
        )
      ),
      h(
        'div',
        { class: 'tbtns' },
        ...(last
          ? []
          : [
              h(
                'button',
                { type: 'button', class: 'sk', on: { click: () => endTour(true) } },
                'Пропустить обучение'
              )
            ]),
        ...(first || (last && false)
          ? []
          : [h('button', { type: 'button', class: 'b', on: { click: () => go(-1) } }, '← Назад')]),
        h(
          'button',
          { type: 'button', class: 'n', on: { click: () => go(1) } },
          first ? 'Начать тур' : last ? 'Готово' : 'Далее →'
        )
      )
    );
    if (!st.c) {
      const el = document.querySelector(st.sel);
      if (el && el.scrollIntoView)
        try {
          el.scrollIntoView({ block: 'nearest' });
        } catch (e) {}
    }
    place();
    setTimeout(place, 60);
    setTimeout(place, 300);
  };
  T.key = e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      endTour(true);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    }
  };
  document.addEventListener('keydown', T.key, true);
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  show();
}
function maybeTour() {
  TOUR_TIMER = null;
  if (W2 || !G.ready || TOUR || tourDone()) return false;
  if (document.getElementById('gate').style.display === 'flex' || modal.classList.contains('on')) {
    TOUR_TIMER = setTimeout(maybeTour, 3000);
    return false;
  }
  startTour();
  return true;
}
