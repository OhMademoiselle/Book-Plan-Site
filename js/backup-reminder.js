/* Напоминание о резервной копии. */
let BKP_DELAY = 15000,
  BKP_TIMER = null;
const DAY = 864e5;
const bkKey = () => 'plan-knigi-bkp:' + ((G.sess && G.sess.uid) || 'anon');
const bkState = () => {
  try {
    return JSON.parse(localStorage.getItem(bkKey())) || {};
  } catch (e) {
    return {};
  }
};
const bkSave = o => {
  try {
    localStorage.setItem(bkKey(), JSON.stringify(Object.assign(bkState(), o)));
  } catch (e) {}
};
function markBackup() {
  bkSave({ last: Date.now(), snooze: 0 });
}
/* первое напоминание — через 3 дня после начала работы, дальше — раз в 2 недели после последней скачанной копии */
function backupDue() {
  const st = bkState(),
    now = Date.now();
  if (!st.first) {
    bkSave({ first: now });
    return false;
  }
  if (st.snooze && now < st.snooze) return false;
  return now - (st.last || st.first) >= (st.last ? 14 : 3) * DAY;
}
function maybeBackupReminder() {
  BKP_TIMER = null;
  if (W2 || !G.ready || !backupDue()) return false;
  const busy =
    document.getElementById('gate').style.display === 'flex' ||
    modal.classList.contains('on') ||
    (document.activeElement && document.activeElement.isContentEditable) ||
    !!TOUR;
  if (busy) {
    BKP_TIMER = setTimeout(maybeBackupReminder, 60000);
    return false;
  }
  backupReminder();
  return true;
}
function backupReminder() {
  bkSave({ snooze: Date.now() + DAY }); /* если закрыть окно кликом мимо — напомним завтра */
  const st = bkState(),
    msg = h('p', { class: 'sett-note', id: 'bkmsg' }, ''),
    box = h('div', { class: 'box big' });
  const tips = () =>
    h(
      'ul',
      {},
      h('li', {}, 'на флешку или внешний диск;'),
      h('li', {}, 'в облачный диск: Google Диск, Яндекс Диск, Dropbox;'),
      h('li', {}, 'отправьте файл себе на почту или в «Избранное» мессенджера.'),
      h('li', {}, 'Лучше хранить в двух местах сразу.')
    );
  const later = (d, l) =>
    h(
      'button',
      {
        type: 'button',
        class: 'bigsec',
        on: {
          click: () => {
            bkSave({ snooze: Date.now() + d * DAY });
            closeModal();
          }
        }
      },
      l
    );
  const step1 = () => {
    const b = h(
      'button',
      {
        type: 'button',
        class: 'bigbtn',
        on: {
          click: async () => {
            b.disabled = true;
            b.textContent = 'Готовлю копию…';
            try {
              dl(await backupData(), 'копия');
              markBackup();
              step2();
            } catch (e) {
              b.disabled = false;
              b.textContent = '⬇ Скачать копию (.json)';
              msg.textContent =
                'Не удалось подготовить копию: ' + ((e && e.msg) || 'попробуйте ещё раз');
            }
          }
        }
      },
      '⬇ Скачать копию (.json)'
    );
    box.replaceChildren(
      h('div', { class: 'bigem' }, '💾'),
      h('h3', {}, 'Сохраните резервную копию'),
      h(
        'p',
        {},
        'Ваши книги хранятся в облаке, но от случайного удаления, ошибки или сбоя сервиса защищает только файл, который лежит у вас.'
      ),
      h(
        'p',
        {},
        st.last
          ? 'Последняя копия с этого устройства: ' + fmtT(st.last) + '.'
          : 'Копию с этого устройства вы ещё ни разу не скачивали.'
      ),
      h('p', {}, 'Скачайте файл и положите его в надёжное место:'),
      tips(),
      b,
      msg,
      later(3, 'Напомнить через 3 дня'),
      later(1, 'Не сейчас: напомнить завтра')
    );
  };
  const step2 = () =>
    box.replaceChildren(
      h('div', { class: 'bigem' }, '✅'),
      h('h3', {}, 'Копия скачана'),
      h(
        'p',
        { class: 'bkdone' },
        'Теперь самое важное: перенесите файл туда, где он не потеряется.'
      ),
      h(
        'p',
        {},
        'Файл сейчас лежит в папке «Загрузки» (или там, куда ваш браузер сохраняет скачанное). Положите его:'
      ),
      tips(),
      h(
        'p',
        {},
        'Вернуть книги из файла можно в ⚙ Настройки → «Восстановить из файла». Напомню снова через 2 недели.'
      ),
      h(
        'button',
        { type: 'button', class: 'bigbtn', on: { click: closeModal } },
        'Готово, файл сохранён'
      )
    );
  step1();
  modal.replaceChildren(box);
  modal.classList.add('on');
}
