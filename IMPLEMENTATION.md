# Implementation Plan

Concrete, sequential build steps with file structure and per-step acceptance criteria. Follow this in order — each step should leave you with something that runs, even if incomplete. Companion docs: [ARCHITECTURE.md](./ARCHITECTURE.md) (why), [API_SPEC.md](./API_SPEC.md) (event contracts), [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) (formulas/data model).

---

## Step 0 — Repo & tooling setup

```
sketchai/
├── client/
├── server/
├── ai-service/
├── README.md
├── ARCHITECTURE.md
├── API_SPEC.md
├── SYSTEM_DESIGN.md
├── ROADMAP.md
└── CONTRIBUTING.md
```

- [ ] `npx create-next-app@latest client` (TypeScript, App Router)
- [ ] `server/` — plain Node project: `npm init -y`, install `express`, `socket.io`, `ioredis`, `jsonwebtoken`, `dotenv`
- [ ] `ai-service/` — Python venv, `fastapi`, `uvicorn`, `sentence-transformers`
- [ ] Spin up Redis locally (Docker: `docker run -p 6379:6379 redis`) and Postgres (Supabase project, or local Docker)
- [ ] `.env.example` in each service directory listing required vars (no real secrets committed)

**Done when:** all three services start locally with a placeholder "hello world" route/handler and no errors.

---

## Step 1 — Room plumbing (no game logic yet)

**Server (`server/src/`):**
```
src/
├── index.ts              # Express + Socket.io bootstrap
├── sockets/
│   └── roomHandlers.ts   # room:create, room:join, room:leave
├── services/
│   └── roomService.ts    # Redis reads/writes for room objects
└── types/
    └── room.types.ts
```

- [ ] Implement `room:create` — generates room code, writes room object to Redis, returns code to creator
- [ ] Implement `room:join` — validates room exists/not full, adds player, broadcasts `room:state`
- [ ] Implement disconnect handling — mark player `connected: false`, trigger host migration if host left
- [ ] Client: minimal UI — "Create Room" / "Join Room" screen, then a lobby screen listing connected players

**Done when:** two browser tabs can create/join the same room and both see the player list update live.

---

## Step 2 — Canvas stroke sync

**Client:**
```
client/
├── components/
│   └── Canvas.tsx        # mouse/touch → local draw + emits stroke:draw
├── hooks/
│   └── useSocket.ts       # socket connection context
```

- [ ] Drawer's canvas captures mouse/touch move events, throttled (e.g., emit every ~16ms, not every pixel)
- [ ] Emits `stroke:draw` with `{x, y, prevX, prevY, color, width}`
- [ ] Server relays via `stroke:broadcast` to all other room members (no filtering yet — full canvas visible)
- [ ] Guesser clients render incoming strokes onto their own canvas
- [ ] `stroke:clear` implemented both directions

**Done when:** one tab draws, a second tab sees it live with no perceptible lag. This is your first genuinely demoable milestone — screen-record it now for later use in the README.

---

## Step 3 — Basic round loop (exact-match scoring)

**Server:**
```
src/
├── services/
│   ├── roundService.ts    # round start/end, timer, word assignment
│   └── scoringService.ts  # pure functions — easiest to unit test
├── data/
│   └── wordBank.json       # static list for now, AI-generated prompts are v2
```

- [ ] `room:startGame` (host-only) picks first drawer, assigns word from static list, emits `round:start` (hint) + `round:startDrawer` (real word, private)
- [ ] Server-side countdown timer per round (`roundDurationSec`), auto-ends round on timeout
- [ ] `guess:submit` handler: exact string match (lowercased, trimmed) against answer → correct/incorrect
- [ ] Flat scoring for now: fixed points to guesser + fixed points to drawer if ≥1 correct guess
- [ ] `round:end` reveals word, broadcasts scores; loop to next round until `totalRounds` reached, then `game:end`

**Done when:** a full match can be played start to finish with real scoring, even though it's just exact-match — the entire game loop works end to end. This is the milestone where the game is *actually playable*, even if not yet differentiated from skribbl.io.

---

## Step 4 — AI semantic guess scoring

**AI service (`ai-service/`):**
```
ai-service/
├── main.py               # FastAPI app, /score-guess endpoint
├── model.py               # loads sentence-transformers model once at startup
└── requirements.txt
```

- [ ] Load `all-MiniLM-L6-v2` once at app startup (not per-request)
- [ ] `POST /score-guess` — compute cosine similarity between guess and answer embeddings, apply thresholds (see SYSTEM_DESIGN.md §4.1), return `{similarity, isCorrect, warmth}`
- [ ] `POST /embed-cache` — cache the answer's embedding once per round so it isn't recomputed per guess (simple in-memory dict keyed by roundId is fine for v1)
- [ ] Server: replace exact-match check in `guess:submit` handler with a call to `POST /score-guess`
- [ ] Client: display live warmth indicator (progress bar or "Hot/Cold" label) from `guess:result`
- [ ] Apply partial-credit points formula from SYSTEM_DESIGN.md §4.1

**Done when:** guessing a near-synonym gives visible partial credit/warmth feedback instead of silence, and this is now the standout feature to show off in a demo.

---

## Step 5 — Drawer accuracy scoring

- [ ] In `roundService.ts`, at round-end, compute `participationRatio` and `speedFactor` from the round's correct-guess data (already tracked in Redis)
- [ ] Apply the formula from SYSTEM_DESIGN.md §4.3
- [ ] Surface the drawer's bonus breakdown in the `round:end` payload so the client can show *why* they got the score they did (transparency matters for a scoring twist to actually land with players)

**Done when:** a clearly-drawn round that most players guess scores visibly higher for the drawer than a round only one person guessed, even if that one guess was fast.

---

## Step 6 — Fog of War

- [ ] Add `revealedFogRegions` tracking to round state in Redis (list of `{x, y, radius}`)
- [ ] On each `stroke:draw`, grow/add a revealed region at that point; also grow radius slowly over elapsed round time (prevents unsolvable late-round fog)
- [ ] Filter `stroke:broadcast` payloads per-recipient so guessers only receive strokes within revealed regions (drawer always gets full, unfiltered strokes)
- [ ] Client: guesser canvas renders only what it receives (no client-side fog logic needed — it simply never gets the hidden data)

**Done when:** guessers visibly can't see the whole drawing at once early in a round, and inspecting WebSocket frames in dev tools confirms the hidden strokes were never sent (this is worth actually checking — it's your proof that filtering is server-side, not just CSS).

---

## Step 7 — Deploy

- [ ] Client → Vercel
- [ ] Game server → Railway or Render (persistent process, not serverless — see ARCHITECTURE.md §7)
- [ ] AI service → Railway/Render, separate service
- [ ] Redis → Upstash or same platform's managed Redis
- [ ] Postgres → Supabase
- [ ] Wire up production env vars, CORS, and WSS (secure WebSocket) on the deployed client
- [ ] Smoke test: full match, two different devices, on two different networks (not just same-WiFi laptop + phone — that hides real latency/CORS issues)

**Done when:** you can send someone outside your household a link and they can join and play with you.

---

## Step 8 — Polish for the README/demo

- [ ] Record a 30–60s GIF or short video of a full round showing warmth feedback + fog reveal
- [ ] Fill in the "Getting Started" section in README.md with real, tested setup steps
- [ ] Add the live demo link to README.md and API_SPEC.md
- [ ] Write the two "how to explain this" sentences from SYSTEM_DESIGN.md §9 into your resume bullet / LinkedIn project description

At this point v1 is done — resist starting ROADMAP.md's v2 features until this is fully shipped and linkable.
