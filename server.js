// Simple Express + Socket.IO server for MathMaxxer (math race)
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const PRESETS = [
  { id: '5min5q', label: '5 min for 5 questions -> scaled', totalTimeSec: 300, questionsPerSegment: 5 },
  { id: '10min10q', label: '10 min for 10 questions', totalTimeSec: 600, questionsPerSegment: 10 },
  { id: '3min5q', label: '3 min for 5 questions', totalTimeSec: 180, questionsPerSegment: 5 },
  { id: '1min5q', label: '1 min for 5 questions (blitz)', totalTimeSec: 60, questionsPerSegment: 5 }
];

let queue = [];
let rooms = {};

function makeId(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function generateQuestion(level) {
  function randint(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
  if (level === 'beginner') {
    const a = randint(1,20), b = randint(1,20);
    if (Math.random() < 0.5) return { text: `${a} + ${b}`, answer: (a+b).toString() };
    return { text: `${a} - ${b}`, answer: (a-b).toString() };
  } else if (level === 'intermediate') {
    const a = randint(2,12), b = randint(2,12);
    if (Math.random() < 0.4) return { text: `${a} × ${b}`, answer: (a*b).toString() };
    const prod = a*b;
    return { text: `${prod} ÷ ${a}`, answer: b.toString() };
  } else if (level === 'advanced') {
    if (Math.random() < 0.5) {
      const x = randint(1,12), m = randint(1,5), c = randint(0,10);
      const val = m*x + c;
      return { text: `Solve for x: ${m}x + ${c} = ${val}`, answer: x.toString() };
    } else {
      const a = randint(1,9), b = randint(1,9), c = randint(1,9), d = randint(1,9);
      const num = a*d + c*b;
      const den = b*d;
      return { text: `${a}/${b} + ${c}/${d} (give simplified fraction or decimal)`, answer: `${num}/${den}` };
    }
  } else {
    return generateQuestion('intermediate');
  }
}

function makeQuestionSet(level, count = 10) {
  const q = [];
  for (let i=0;i<count;i++) q.push(generateQuestion(level));
  return q;
}

io.on('connection', socket => {
  socket.player = { id: socket.id, name: 'Anonymous' };

  socket.on('join_queue', ({ name, level, presetId, vsBot }) => {
    socket.player.name = name || 'Player';
    socket.player.level = level || 'beginner';
    socket.player.preset = PRESETS.find(p=>p.id===presetId) || PRESETS[0];
    socket.emit('presets', PRESETS);

    if (vsBot) {
      const roomId = makeId('room_');
      const questions = makeQuestionSet(socket.player.level, 10);
      const match = {
        id: roomId,
        players: {},
        questions,
        startedAt: Date.now(),
        preset: socket.player.preset,
        state: 'playing'
      };
      match.players[socket.id] = {
        id: socket.id,
        name: socket.player.name,
        score: 0,
        timeLeft: match.preset.totalTimeSec,
        answers: [],
        isBot: false
      };
      const botId = makeId('bot_');
      match.players[botId] = {
        id: botId,
        name: 'MathBot',
        score: 0,
        timeLeft: match.preset.totalTimeSec,
        answers: [],
        isBot: true,
        botAccuracy: socket.player.level === 'beginner' ? 0.9 : socket.player.level === 'intermediate' ? 0.75 : 0.6,
        botSpeedRangeSec: socket.player.level === 'beginner' ? [2,6] : socket.player.level === 'intermediate' ? [1.5,5] : [1,4]
      };
      rooms[roomId] = match;
      socket.join(roomId);
      socket.emit('match_start', { roomId, match });
      startBotForMatch(roomId, botId);
      startMatchTimers(roomId);
    } else {
      queue.push(socket);
      socket.emit('queued');
      attemptMatch();
    }
  });

  socket.on('submit_answer', ({ roomId, qIndex, answer }) => {
    const match = rooms[roomId];
    if (!match) return;
    const player = match.players[socket.id];
    if (!player) return;
    const q = match.questions[qIndex];
    if (!q) return;
    const correct = normalizeAnswer(answer) === normalizeAnswer(q.answer);
    player.answers[qIndex] = { answer, correct, time: Date.now() };
    if (correct) {
      player.score = (player.score || 0) + 1;
    }
    io.to(roomId).emit('update', { match });
    checkMatchEnd(match);
  });

  socket.on('disconnect', () => {
    queue = queue.filter(s => s.id !== socket.id);
    for (const rid in rooms) {
      const match = rooms[rid];
      if (match.players[socket.id]) {
        match.players[socket.id].disconnected = true;
        io.to(rid).emit('update', { match });
      }
    }
  });
});

function normalizeAnswer(a) {
  if (a === undefined || a === null) return '';
  const s = String(a).trim();
  if (s.includes('/')) {
    const parts = s.split('/').map(p => parseInt(p));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] !== 0) {
      const g = gcd(Math.abs(parts[0]), Math.abs(parts[1]));
      return `${parts[0]/g}/${parts[1]/g}`;
    }
  }
  const num = Number(s);
  if (!isNaN(num)) return String(num);
  return s.toLowerCase();
}
function gcd(a,b){ return b===0? a : gcd(b, a%b); }

function attemptMatch() {
  if (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();
    const roomId = makeId('room_');
    const level = a.player.level || b.player.level || 'beginner';
    const preset = a.player.preset || b.player.preset || PRESETS[0];
    const questions = makeQuestionSet(level, 10);
    const match = {
      id: roomId,
      players: {},
      questions,
      startedAt: Date.now(),
      preset,
      state: 'playing'
    };
    match.players[a.id] = { id: a.id, name: a.player.name, score: 0, timeLeft: preset.totalTimeSec, answers: [], isBot:false };
    match.players[b.id] = { id: b.id, name: b.player.name, score: 0, timeLeft: preset.totalTimeSec, answers: [], isBot:false };
    rooms[roomId] = match;
    a.join(roomId);
    b.join(roomId);
    a.emit('match_start', { roomId, match });
    b.emit('match_start', { roomId, match });
    startMatchTimers(roomId);
  }
}

function startBotForMatch(roomId, botId) {
  const match = rooms[roomId];
  if (!match) return;
  const bot = match.players[botId];
  const players = Object.values(match.players);
  const humanId = players.find(p => !p.isBot).id;
  let idx = 0;
  const botLoop = setInterval(() => {
    if (!rooms[roomId] || match.state !== 'playing') { clearInterval(botLoop); return; }
    if (idx >= match.questions.length) { clearInterval(botLoop); return; }
    if (bot.score >= 10) { clearInterval(botLoop); return; }
    const [minS, maxS] = bot.botSpeedRangeSec;
    const delay = minS + Math.random()*(maxS-minS);
    setTimeout(() => {
      if (!rooms[roomId] || match.state !== 'playing') return;
      const q = match.questions[idx];
      const willBeCorrect = Math.random() < bot.botAccuracy;
      const answer = willBeCorrect ? q.answer : (Number(q.answer.replace(/[^0-9-]/g,'')) || 1) + Math.round((Math.random()*5)+1);
      bot.answers[idx] = { answer, correct: willBeCorrect, time: Date.now() };
      if (willBeCorrect) bot.score += 1;
      io.to(roomId).emit('update', { match });
      checkMatchEnd(match);
    }, delay*1000);
    idx++;
  }, 800);
}

function startMatchTimers(roomId) {
  const match = rooms[roomId];
  if (!match) return;
  match._timer = setInterval(() => {
    if (!rooms[roomId]) { clearInterval(match._timer); return; }
    if (match.state !== 'playing') return;
    for (const pid in match.players) {
      const p = match.players[pid];
      if (p.timeLeft > 0) p.timeLeft -= 1;
    }
    io.to(roomId).emit('tick', { match });
    for (const pid in match.players) {
      const p = match.players[pid];
      if (p.timeLeft <= 0) {
        checkMatchEnd(match);
      }
    }
  }, 1000);
}

function checkMatchEnd(match) {
  if (!match || match.state !== 'playing') return;
  const players = Object.values(match.players);
  for (const p of players) {
    if (p.score >= 10) {
      finishMatch(match, p.id);
      return;
    }
  }
  const allStopped = players.every(p => (p.timeLeft <= 0) || p.disconnected || p.isBot && p.score>=10);
  if (allStopped) {
    let sorted = players.slice().sort((a,b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.timeLeft - a.timeLeft;
    });
    finishMatch(match, sorted[0].id);
  }
}

function finishMatch(match, winnerId) {
  if (!match || match.state !== 'playing') return;
  match.state = 'finished';
  clearInterval(match._timer);
  for (const pid in match.players) {
    const p = match.players[pid];
    const base = 100;
    const levelFactor = match.questions.length >= 10 ? 20 : 10;
    const perf = (p.score / match.questions.length) * 50;
    const timeBonus = Math.round((p.timeLeft / match.preset.totalTimeSec) * 30);
    p.iq = Math.round(base + levelFactor + perf + timeBonus);
  }
  match.winner = winnerId;
  io.to(match.id).emit('match_end', { match });
  setTimeout(() => {
    delete rooms[match.id];
  }, 60*1000);
}

http.listen(PORT, () => {
  console.log('MathMaxxer server listening on', PORT);
});