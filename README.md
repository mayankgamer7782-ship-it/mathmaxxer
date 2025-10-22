# Math Race (prototype)

Realtime math race: solve 10 questions before your opponent. Built with Node.js + Express + Socket.IO.

Features
- Realtime multiplayer (or play vs bot).
- Select difficulty levels: beginner / intermediate / advanced.
- Time control presets (e.g., 5 minutes for 5 questions).
- First to 10 correct wins; if time expires, higher score wins.
- Simple IQ rating at end of match.

Run locally
1. Install dependencies:
   npm install
2. Start server:
   npm start
3. Open http://localhost:3000 in two browser windows (or use vs Bot).

Notes
- This is a minimal prototype. Questions are generated server-side and validated by the server.
- Bot behavior is deterministic-ish with randomized delay and accuracy per difficulty level.

Potential next steps:
- Persist user accounts and ratings.
- ELO-like rating system replacing simple IQ formula.
- Improve timer/clock behavior (implement alternating clocks for turn-based mechanics).
- Add more question types, multi-step problems, and better answer normalization.
- Add authentication, lobby UI, and matchmaking improvements.