/* Применяет сохранённые тему и раскладку (ширину и скрытие панелей) до отрисовки страницы, чтобы не было «мигания». */
try {
  var t = localStorage.getItem('plan-knigi-theme');
  if (t && /^[a-z]{3,12}$/.test(t) && t !== 'auto') document.documentElement.dataset.theme = t;
} catch (e) {}
try {
  var L = JSON.parse(localStorage.getItem('plan-knigi-layout') || 'null');
  if (L) {
    var r = document.documentElement;
    if (L.ow >= 160 && L.ow <= 600) r.style.setProperty('--ow', L.ow + 'px');
    if (L.pw >= 160 && L.pw <= 600) r.style.setProperty('--pw', L.pw + 'px');
    if (L.ho) r.classList.add('lo-off');
    if (L.hi) r.classList.add('li-off');
  }
} catch (e) {}
