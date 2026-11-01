// "Ask about Aman": answers questions from the knowledge base in kb.js, retrieved in the browser (retrieve.js).
// Each answer can offer buttons to its stops; drive.js turns a click on [data-stop] into a drive to that stop.

import { answer } from './retrieve.js';

const STOPS = {
  temple: 'Temple', gluco: 'GlucoTrace', eeg: 'Mobile EEG', ppg: 'Wrist PPG', chat: 'Chat-to-Pay',
  gnn: 'GNN-DDI', vmd: 'Forecasting', paper: 'IEEE paper', oss: 'Open source', contact: 'Contact',
};

const fab = document.getElementById('chatFab');
const panel = document.getElementById('chat');
const log = document.getElementById('chatLog');
const chips = document.getElementById('chatChips');
const form = document.getElementById('chatForm');
const input = document.getElementById('chatInput');
let busy = false;

// on touch screens the keyboard would cover the suggestions, so the input is focused only when tapped
const focusInput = () => { if (!matchMedia('(pointer: coarse)').matches) input.focus({ preventScroll: true }); };

function setOpen(on) {
  panel.hidden = !on;
  fab.setAttribute('aria-expanded', String(on));
  document.body.classList.toggle('chat-open', on);
  if (on) {
    fab.classList.add('seen');
    if (!log.childElementCount) addMessage('assistant', "Hi! I can answer questions about Aman's work: his projects, experience and skills. What would you like to know?");
    focusInput();
  }
}
fab.addEventListener('click', () => setOpen(panel.hidden));

panel.querySelector('.chat__close').addEventListener('click', () => { setOpen(false); fab.focus(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); fab.focus(); } });

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function render(text, stops = []) {
  const body = escapeHtml(text)
    .replace(/\[([^\]]+)\]\(((?:https:\/\/|mailto:|\/)[^\s)]+)\)/g, (_, label, url) =>
      `<a href="${url}"${url.startsWith('https:') || url.endsWith('.pdf') ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
  const buttons = stops.filter((id) => STOPS[id]).slice(0, 2)
    .map((id) => `<button type="button" class="msg__stop" data-stop="${id}">Drive to ${STOPS[id]} →</button>`).join('');
  return body + (buttons ? `<div class="msg__stops">${buttons}</div>` : '');
}

function addMessage(role, text, stops, extraClass = '') {
  const el = document.createElement('div');
  el.className = `msg msg--${role} ${extraClass}`.trim();
  el.innerHTML = role === 'assistant' ? render(text, stops) : escapeHtml(text);
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function ask(question) {
  if (busy) return;
  busy = true;
  chips.hidden = true;
  addMessage('user', question);
  const typing = addMessage('assistant', '', [], 'msg--typing');
  typing.innerHTML = '<i></i><i></i><i></i>';
  const { text, stops } = answer(question);
  // a short pause so the reply reads like a reply, not an instant swap
  setTimeout(() => {
    typing.remove();
    addMessage('assistant', text, stops);
    busy = false;
    focusInput();
  }, 380 + Math.min(text.length, 400));
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  ask(q.slice(0, 500));
});
chips.addEventListener('click', (e) => {
  const chip = e.target.closest('button');
  if (chip) ask(chip.textContent);
});

// on phones the panel covers the scene, so close it when the visitor picks a stop to drive to
log.addEventListener('click', (e) => {
  if (e.target.closest('.msg__stop') && matchMedia('(max-width: 700px)').matches) setOpen(false);
});

// a speech bubble pops out of the button with two questions about the stop the car is at.
// Each stop's bubble shows once, hides itself after a while, and × turns the bubbles off for the visit.
const PEEKS = {
  'stop-start': ["Hi! I'm Aman's assistant. Ask me anything about his work.", ['What has he built?', 'Has he shipped ML to production?']],
  'stop-temple': ['Curious what he built at Temple?', ['What did he do at Temple?', 'Did his work ship to production?']],
  'stop-gluco': ['Want the story behind GlucoTrace?', ['What is GlucoTrace?', 'How does GlucoTrace handle missing data?']],
  'stop-eeg': ['Questions about the EEG score?', ['How does the EEG quality score work?', 'Did the EEG score work while jogging?']],
  'stop-ppg': ['How does a watch read a heartbeat on a run?', ['How does the PPG cleaning work?', 'What did the PPG project find?']],
  'stop-chat': ['Want to know how Chat-to-Pay works?', ['What is Chat-to-Pay?', 'What has he built with LLMs?']],
  'stop-gnn': ['Curious about the drug-interaction model?', ['What does the GNN predict?', 'How was the GNN evaluated?']],
  'stop-vmd': ['Questions about the river-flow forecasts?', ['How does the forecasting work?', 'What is VMD?']],
  'stop-paper': ['Want a quick summary of the paper?', ['What is his IEEE paper about?', 'Where was it published?']],
  'stop-oss': ['Ask about his open-source work.', ['What did he contribute to NeuroKit2?', 'Is GlucoTrace open source?']],
  'stop-contact': ['Thinking of reaching out?', ['How can I contact him?', 'Is he open to remote roles?']],
};
const peek = document.getElementById('chatPeek');
const peekText = document.getElementById('chatPeekText');
const peekQs = document.getElementById('chatPeekQs');
const shown = new Set();
let peeksOff = false, peekTimer = 0, hideTimer = 0, here = 'stop-start';
try { peeksOff = sessionStorage.getItem('peeksOff') === '1'; } catch { /* storage blocked: bubbles stay on */ }

function hidePeek() {
  clearTimeout(peekTimer); clearTimeout(hideTimer);
  peek.classList.remove('in');
  hideTimer = setTimeout(() => { peek.hidden = true; }, 250);
}

function showPeek(id) {
  const p = PEEKS[id];
  if (!p || peeksOff || shown.has(id) || !panel.hidden) return;
  // on phones the intro card fills the top of the screen, so the bubbles start at the first project
  if (id === 'stop-start' && document.body.classList.contains('is-3d') && matchMedia('(max-width: 700px)').matches) return;
  shown.add(id);
  clearTimeout(hideTimer);
  peek.hidden = false;
  peekText.innerHTML = '<span class="chat-peek__typing"><i></i><i></i><i></i></span>';
  peekQs.innerHTML = '';
  requestAnimationFrame(() => peek.classList.add('in'));
  // a moment of "typing" first, so the bubble reads like someone saying hello
  peekTimer = setTimeout(() => {
    peekText.textContent = p[0];
    peekQs.innerHTML = p[1].map((q) => `<button type="button">${escapeHtml(q)}</button>`).join('');
    peekTimer = setTimeout(hidePeek, 12000);
  }, 750);
}

// wait until the car has stayed at a stop for a moment, so driving past doesn't flash bubbles
document.addEventListener('stopchange', (e) => {
  here = e.detail.id;
  clearTimeout(peekTimer);
  if (!peek.hidden) hidePeek();
  peekTimer = setTimeout(() => { if (here === e.detail.id) showPeek(here); }, 1400);
});
setTimeout(() => showPeek(here), 2500);

peekQs.addEventListener('click', (e) => {
  const q = e.target.closest('button');
  if (!q) return;
  hidePeek();
  setOpen(true);
  ask(q.textContent);
});
peek.querySelector('.chat-peek__close').addEventListener('click', () => {
  peeksOff = true;
  try { sessionStorage.setItem('peeksOff', '1'); } catch { /* fine for this page view */ }
  hidePeek();
});
fab.addEventListener('click', hidePeek);
