// "Ask about Aman": sends questions to /api/ask (a Netlify Function that calls Claude) and shows the answers.
// [[stop:x]] markers in an answer become buttons; drive.js turns a click on [data-stop] into a drive to that stop.

const STOPS = {
  temple: 'Temple', gluco: 'GlucoTrace', eeg: 'Mobile EEG', ppg: 'Wrist PPG', chat: 'Chat-to-Pay',
  gnn: 'GNN-DDI', vmd: 'Forecasting', paper: 'IEEE paper', oss: 'Open source', contact: 'Contact',
};
const EMAIL = 'amantripathi3273@gmail.com';
const UNAVAILABLE = `The assistant isn't available right now. You can email Aman at ${EMAIL}.`;

const fab = document.getElementById('chatFab');
const panel = document.getElementById('chat');
const log = document.getElementById('chatLog');
const chips = document.getElementById('chatChips');
const form = document.getElementById('chatForm');
const input = document.getElementById('chatInput');
const history = [];
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

// the button stays hidden unless the server says the assistant is set up
fetch('/api/ask')
  .then((res) => (res.ok ? res.json() : {}))
  .then((data) => { if (data.ready) fab.hidden = false; })
  .catch(() => {});
panel.querySelector('.chat__close').addEventListener('click', () => { setOpen(false); fab.focus(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); fab.focus(); } });

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function render(text) {
  const stops = [...text.matchAll(/\[\[stop:([a-z]+)\]\]/g)].map((m) => m[1]).filter((id) => STOPS[id]);
  const body = escapeHtml(text.replace(/\[\[stop:[a-z]+\]\]/g, '').trim())
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(new RegExp(EMAIL.replace(/\./g, '\\.'), 'g'), `<a href="mailto:${EMAIL}">${EMAIL}</a>`)
    .replace(/\n/g, '<br>');
  const buttons = [...new Set(stops)].slice(0, 2)
    .map((id) => `<button type="button" class="msg__stop" data-stop="${id}">Drive to ${STOPS[id]} →</button>`).join('');
  return body + (buttons ? `<div class="msg__stops">${buttons}</div>` : '');
}

function addMessage(role, text, extraClass = '') {
  const el = document.createElement('div');
  el.className = `msg msg--${role} ${extraClass}`.trim();
  el.innerHTML = role === 'assistant' ? render(text) : escapeHtml(text);
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

async function ask(question) {
  if (busy) return;
  busy = true;
  form.classList.add('busy');
  chips.hidden = true;
  addMessage('user', question);
  history.push({ role: 'user', content: question });
  const typing = addMessage('assistant', '', 'msg--typing');
  typing.innerHTML = '<i></i><i></i><i></i>';
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-10) }),
    });
    const data = await res.json().catch(() => ({}));
    typing.remove();
    if (res.ok && data.reply) {
      history.push({ role: 'assistant', content: data.reply });
      addMessage('assistant', data.reply);
    } else {
      history.pop();
      addMessage('assistant', res.status === 429 && data.error ? data.error : UNAVAILABLE, 'msg--error');
    }
  } catch (e) {
    typing.remove();
    history.pop();
    addMessage('assistant', UNAVAILABLE, 'msg--error');
  } finally {
    busy = false;
    form.classList.remove('busy');
    input.focus();
  }
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
