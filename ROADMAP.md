# Roadmap

## v1 — MVP (build this first, ship it, then stop)

Goal: a fully working, deployed, demoable game with the two core differentiators (semantic scoring + drawer accuracy scoring) implemented well — not six features implemented shallowly.

- [ ] Room creation/join with room code, host controls, host migration on disconnect
- [ ] Real-time canvas stroke sync (drawer → all guessers)
- [ ] Round loop: word assignment, countdown timer, round-end reveal
- [ ] Exact-match guess scoring (baseline, before AI is wired in)
- [ ] AI semantic guess scoring via FastAPI microservice, with live warmth indicator
- [ ] Drawer accuracy scoring formula (participation ratio × speed factor)
- [ ] Server-side Fog of War stroke filtering
- [ ] Post-round and post-match leaderboard
- [ ] Deployed live: client on Vercel, server + AI service on Railway/Render, Postgres on Supabase
- [ ] README with GIF/screenshot demo + live link

**Definition of done for v1:** a stranger can open the live link, create or join a room from their phone, play a full 5-round match with at least one other person, and see the scoring differentiators in action without you explaining anything.

---

## v2 — Stretch features (only after v1 is deployed and demoable)

Pick 1–2 of these to add polish, don't attempt all at once:

- [ ] **Power-up economy** — spend banked points to freeze another player's canvas, force a color swap, inject a decoy guess, or reveal a letter
- [ ] **Twist rounds** — every 3rd round applies a modifier: speed round (10s), reverse mode (AI picks closest interpretation among multiple drawers), silent mode (no warmth hints)
- [ ] **Difficulty-voted AI prompts** — replace static word bank with AI-generated prompts at a room-voted difficulty tier, so words never repeat
- [ ] **Post-game AI recap** — AI-generated one-paragraph recap highlighting standout moments (closest last-second guess, best/worst drawing)
- [ ] **Persistent accounts + global leaderboard** — signup/login, cross-match stats
- [ ] **Mobile-optimized drawing UI** — touch-friendly canvas controls, since guests will often join from phones

---

## Explicitly out of scope (don't build these — they're scope traps)

- Spectator mode / rejoining mid-match as a new player
- Voice/video chat
- Custom word-bank uploads by users
- Tournament/bracket mode
- Native mobile app (web is sufficient for a portfolio demo)

If you find yourself building something from this list before v1 is fully shipped, stop and come back to the checklist above.
