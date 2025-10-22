// Client-side logic
const socket = io();

let myId = null;
let roomId = null;
let match = null;
let currentIndex = 0;

const nameEl = document.getElementById('name');
const levelEl = document.getElementById('level');
const presetEl = document.getElementById('preset');
const joinBtn = document.getElementById('join');
const vsBotEl = document.getElementById('vsBot');
const statusEl = document.getElementById('status');

const lobbyEl = document.getElementById('lobby');
const gameEl = document.getElementById('game');
const currentQEl = document.getElementById('currentQ');
const answerEl = document.getElementById('answer');
const submitBtn = document.getElementById('submitAns');
const meInfoEl = document.getElementById('meInfo');
const opInfoEl = document.getElementById('opInfo');
const progressEl = document.getElementById('progress');
const logEl = document.getElementById('log');
const backBtn = document.getElementById('backToLobby');

socket.on('connect', () => {
  myId = socket.id;
});

socket.on('presets', (presets) => {
  // populate preset options
  presetEl.innerHTML = '';
  presets.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.textContent = p.label;
    presetEl.appendChild(opt);
  });
});

joinBtn.onclick = () => {
  statusEl.textContent = 'Joining...';
  socket.emit('join_queue', { name: nameEl.value, level: levelEl.value, presetId: presetEl.value, vsBot: vsBotEl.checked });
};

socket.on('queued', () => {
  statusEl.textContent = 'Queued — waiting for opponent... (or play vs bot)';
});

socket.on('match_start', ({ roomId: rId, match: m }) => {
  roomId = rId;
  match = m;
  currentIndex = 0;
  lobbyEl.style.display = 'none';
  gameEl.style.display = 'block';
  statusEl.textContent = '';
  logEl.innerHTML = `<b>Match started</b><br/>Questions: ${m.questions.length}<br/>Preset: ${m.preset.label}`;
  renderMatch();
});

socket.on('tick', ({ match: m }) => {
  match = m;
  renderMatch();
});

socket.on('update', ({ match: m }) => {
  match = m;
  renderMatch();
});

socket.on('match_end', ({ match: m }) => {
  match = m;
  renderMatch(true);
});

function renderMatch(finished=false) {
  if (!match) return;
  const me = match.players[socket.id] || Object.values(match.players).find(p=>!p.isBot && !p.id.startsWith('bot'));
  const others = Object.values(match.players).filter(p => p.id !== (me && me.id));
  const op = others[0] || { name: 'Waiting', score:0, timeLeft: match.preset.totalTimeSec };

  meInfoEl.innerHTML = `<b>${me.name}</b> — Score: ${me.score} — Time: ${me.timeLeft}s`;
  opInfoEl.innerHTML = `<b>${op.name}</b> — Score: ${op.score} — Time: ${op.timeLeft}s`;

  // current question
  const q = match.questions[currentIndex] || { text: 'No more questions' };
  currentQEl.textContent = `Q${currentIndex+1}: ${q.text}`;

  progressEl.innerHTML = `Progress: You ${me.score} / Opponent ${op.score}`;

  // log recent answers
  logEl.innerHTML = `<b>Recent answers</b><br/>`;
  for (let i=0;i<match.questions.length;i++){
    const qa = me.answers && me.answers[i];
    const oa = op.answers && op.answers[i];
    logEl.innerHTML += `Q${i+1}: ${match.questions[i].text} <br/> &nbsp;&nbsp;You: ${qa ? qa.answer + (qa.correct ? ' ✅' : ' ❌') : '-'} | Opp: ${oa ? oa.answer + (oa.correct ? ' ✅' : ' ❌') : '-'}<br/>`;
  }

  if (finished || match.state === 'finished') {
    // show winner
    const winner = match.winner;
    const winnerName = match.players[winner].name;
    logEl.innerHTML += `<br/><b>Match finished. Winner: ${winnerName}</b><br/>`;
    // IQ ratings
    for (const pid in match.players) {
      const p = match.players[pid];
      logEl.innerHTML += `${p.name} — score ${p.score} — IQ ${p.iq}<br/>`;
    }
    backBtn.style.display = 'inline-block';
  } else {
    backBtn.style.display = 'none';
  }
}

submitBtn.onclick = submitAnswer;
answerEl.onkeydown = (e) => { if (e.key === 'Enter') submitAnswer(); }

function submitAnswer(){
  const ans = answerEl.value.trim();
  answerEl.value = '';
  if (!match) return;
  const qIndex = currentIndex;
  socket.emit('submit_answer', { roomId, qIndex, answer: ans });
  // advance to next question locally (server will validate)
  currentIndex = Math.min(currentIndex+1, match.questions.length-1);
}

backBtn.onclick = () => {
  location.reload();
};