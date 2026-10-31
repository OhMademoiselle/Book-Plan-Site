/* Общие окна: всплывающее окно (modal) и сообщение в окне входа. */
let saved = null;
const modal = document.getElementById('modal');
const closeModal = () => modal.classList.remove('on');
modal.addEventListener('click', ev => {
  if (ev.target === modal) closeModal();
});
const gm = t => {
  const m = document.getElementById('gmsg');
  if (m) m.textContent = t;
};
