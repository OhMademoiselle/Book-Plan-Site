/* Темы оформления. */
/* темы оформления (запоминаются на каждом устройстве отдельно); выбираются в ⚙ Настройки */
const THEMES = [
  ['auto', '🌓', 'Как в системе', 'linear-gradient(135deg,#faf8f5 50%,#1c1b1a 50%)'],
  ['light', '☀️', 'Светлая', 'linear-gradient(135deg,#faf8f5 55%,#6b5bd2 55%)'],
  ['dark', '🌙', 'Тёмная', 'linear-gradient(135deg,#1c1b1a 55%,#a99cff 55%)'],
  ['sakura', '🌸', 'Сакура', 'linear-gradient(135deg,#fff3f6 55%,#d6457a 55%)'],
  ['forest', '🌲', 'Лес', 'linear-gradient(135deg,#eff4eb 55%,#3b8450 55%)'],
  ['sunset', '🌅', 'Закат', 'linear-gradient(135deg,#fff2e5 55%,#e0562f 55%)'],
  ['coffee', '☕', 'Кофе', 'linear-gradient(135deg,#ece0cd 55%,#8a5628 55%)'],
  ['ocean', '🌊', 'Океан', 'linear-gradient(135deg,#0e1d2a 55%,#4fc3f7 55%)'],
  ['neon', '🪩', 'Неон', 'linear-gradient(135deg,#0d0b1a 55%,#ff4fd8 55%)'],
  ['terminal', '👾', 'Терминал', 'linear-gradient(135deg,#050805 55%,#39ff14 55%)']
];
function getTheme() {
  let v = 'auto';
  try {
    v = localStorage.getItem('plan-knigi-theme') || 'auto';
  } catch (e) {}
  return THEMES.some(t => t[0] === v) ? v : 'auto';
}
function setTheme(v) {
  if (!THEMES.some(t => t[0] === v)) v = 'auto';
  try {
    localStorage.setItem('plan-knigi-theme', v);
  } catch (e) {}
  if (v === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = v;
}
setTheme(getTheme());
document.getElementById('st').onclick = () => openSettings();
