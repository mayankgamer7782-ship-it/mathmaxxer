async function postJson(url, body) {
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  return res.json();
}
let token = null;
document.getElementById('loginBtn').onclick = async () => {
  const p = document.getElementById('password').value;
  const r = await postJson('/admin/login', { password: p });
  if (r.ok) {
    token = r.token;
    document.getElementById('login').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    loadQuestions();
    loadPlayers();
  } else {
    document.getElementById('loginMsg').textContent = 'Bad password';
  }
};

document.getElementById('addQ').onsubmit = async (e) => {
  e.preventDefault();
  const q = { level: document.getElementById('qLevel').value, prompt: document.getElementById('qPrompt').value, canonical_answer: document.getElementById('qAnswer').value };
  const res = await fetch('/admin/questions', { method:'POST', headers:{ 'Content-Type':'application/json', 'x-admin-token': token }, body: JSON.stringify(q) });
  if (res.ok) {
    document.getElementById('qPrompt').value=''; document.getElementById('qAnswer').value='';
    loadQuestions();
  } else {
    alert('Failed');
  }
};

async function loadQuestions() {
  const r = await fetch('/admin/questions', { headers: { 'x-admin-token': token } });
  const list = await r.json();
  const el = document.getElementById('questionsList');
  el.innerHTML = list.map(q => `<div>(${q.level}) ${q.prompt} — ${q.canonical_answer}</div>`).join('');
}

async function loadPlayers() {
  const r = await fetch('/admin/players', { headers: { 'x-admin-token': token } });
  const list = await r.json();
  const el = document.getElementById('playersList');
  el.innerHTML = list.map(p => `<div>${p.name} — IQ ${p.iq_rating}</div>`).join('');
}