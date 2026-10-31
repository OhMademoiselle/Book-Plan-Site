/* Применяет сохранённую тему до отрисовки страницы, чтобы не было «мигания». */
try {
  var t = localStorage.getItem('plan-knigi-theme');
  if (t && /^[a-z]{3,12}$/.test(t) && t !== 'auto') document.documentElement.dataset.theme = t;
} catch (e) {}
