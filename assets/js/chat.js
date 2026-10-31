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

function setOpen(on) {
  panel.hidden = !on;
  fab.setAttribute('aria-expanded', String(on));
  document.body.classList.toggle('chat-open', on);
  if (on) {
    if (!log.childElementCount) addMessage('assistant', "Hi! I can answer questions about Aman's work: his projects, experience and skills. What would you like to know?");
    input.focus();
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
