# Architecture

High-level system architecture, service boundaries, and the reasoning behind each choice. For event-by-event API details, see [API_SPEC.md](./API_SPEC.md). For scoring formulas and data model, see [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md).

---

## 1. System Overview

```
┌─────────────┐        WebSocket         ┌──────────────────┐
│   React     │ <----------------------> │  Node/Express     │
│   Client    │                          │  Game Server       │
│ (Canvas UI) │        REST (auth)       │  (Socket.io)       │
└─────────────┘ <----------------------> └──────────────────┘
                                              │         │
                                       HTTP   │         │  Redis (room state,
                                       (guess │         │  active rounds,
                                       scoring)│        │  player sessions)
                                              ▼         ▼
                                    ┌────────────┐  ┌──────────┐
                                    │  FastAPI    │  │ Postgres  │
                                    │  AI Judge   │  │ (users,   │
                                    │  Service    │  │  match    │
                                    │ (embeddings)│  │  history) │
                                    └────────────┘  └──────────┘
```

Three independent services, each doing one job:

| Service | Responsibility | Why separate |
|---|---|---|
| **Game Server** (Node/Express + Socket.io) | Room lifecycle, WebSocket relay, round timing, is the single source of truth for game state | Real-time layer needs to stay lightweight and low-latency — no heavy computation here |
| **AI Judge Service** (FastAPI) | Embedding-based guess scoring | Isolated so the model can be swapped, scaled, or rate-limited independently without touching the game loop |
| **Client** (React/Next.js) | Rendering only — canvas, chat, scoreboard | Never trusted to compute scores, correctness, or fog regions itself |

## 2. Core Architectural Principle: Server-Authoritative State

The client **never** decides:
- Whether a guess is correct
- What a player's score is
- What part of the canvas is visible (Fog of War)
- Whose turn it is to draw

The client only sends **intents** (`guess:submit`, `stroke:draw`) and renders whatever the server broadcasts back. This is the same trust model real multiplayer games use, and it's the detail worth calling out in interviews — it's what separates "a chat app with a canvas" from an actual game architecture.

**Concretely:** a technically curious player could open dev tools and inspect WebSocket frames. Because fog filtering and scoring happen server-side, there's nothing to game by reading network traffic — the server simply never sends data the client isn't supposed to see yet.

## 3. Why Redis + Postgres (not just one database)

- **Redis** — active room state changes on every stroke and every guess (potentially dozens of writes/second per room). It needs to be fast, and it's fine if it's ephemeral — if a room dies, nobody needs that data back. TTL-based expiry means no cleanup cron job.
- **Postgres** — match history, user accounts, and leaderboards need to persist and be queryable (`WHERE user_id = ... ORDER BY score DESC`). This is written to only at round-end/match-end, asynchronously, so a slow Postgres write never stalls a live round.

This split is a standard pattern for real-time apps (hot ephemeral state vs. durable relational data) and is worth explicitly naming as a decision, not just "I used two databases."

## 4. Why a Separate AI Microservice Instead of Calling an LLM API Directly from Node

- **Latency**: guesses happen at high frequency during a live round. A local embedding model (e.g., `all-MiniLM-L6-v2` via `sentence-transformers`) run in-process in FastAPI responds in milliseconds; a hosted LLM API call would add hundreds of ms per guess and cost per call.
- **Separation of concerns**: the game server shouldn't know anything about embeddings, similarity thresholds, or model versions — it just calls `POST /score-guess` and gets a number back. The AI service could be swapped for a different model entirely without touching game-server code.
- **Independent scaling**: if guess volume spikes, the AI service can be scaled (more instances) without needing to also scale the stateful WebSocket server (which is harder to horizontally scale due to sticky sessions).

## 5. Data Flow: A Single Guess, End to End

```
1. Player types a guess in the client → emits `guess:submit` over WebSocket
2. Game server receives it, looks up the round's answer word (from Redis)
3. Game server calls FastAPI: POST /score-guess { guess, answer }
4. FastAPI returns { similarity, isCorrect, warmth }
5. Game server calculates points (see SYSTEM_DESIGN.md §4.1) and updates Redis room state
6. Game server emits `guess:result` privately to the guesser (warmth + points)
7. If correct: game server emits `guess:correctAnnounce` to the whole room (no guess content revealed)
8. If all players have guessed correctly (or timer runs out): game server triggers round:end,
   computes drawer accuracy score, writes round result to Postgres asynchronously
```

## 6. Data Flow: A Single Stroke, End to End (Fog of War)

```
1. Drawer moves cursor on canvas → client emits `stroke:draw` { x, y, prevX, prevY, ... }
2. Game server receives it, updates `revealedFogRegions` for the round (adds/grows a circle at that point)
3. For each connected guesser, game server checks: does this stroke fall within revealed regions
   visible to THIS specific player? (regions are shared/global per round, not per-player, for v1 —
   simpler and still achieves the pacing effect)
4. Server relays `stroke:broadcast` to guessers with the filtered stroke data
5. Drawer's own client always renders the full, unfiltered canvas locally (no need to round-trip
   their own strokes back to themselves for fog purposes)
```

## 7. Deployment Topology

```
Vercel (client, static + edge)
   │
   ├── WSS ──> Railway/Render (Node game server, persistent process — needs to stay warm
   │            for WebSocket connections, not serverless)
   │              │
   │              ├── Redis (same platform or Upstash)
   │              └── HTTP ──> Railway/Render (FastAPI AI service, can be separate small instance)
   │
   └── (auth REST calls) ──> Node game server ──> Supabase Postgres
```

**Why not serverless for the game server:** WebSocket connections are long-lived and stateful; standard serverless functions (e.g., Vercel functions) aren't a good fit for holding open socket connections. The game server needs a platform that supports long-running processes (Railway, Render, Fly.io, or a small EC2/VPS instance).

## 8. Scaling Notes (not needed for v1, but worth knowing the answer to if asked)

- Multiple game-server instances would need a shared adapter (e.g., `socket.io-redis-adapter`) so broadcasts reach players connected to a different instance than the sender — Redis pub/sub handles this cleanly since Redis is already in the stack.
- Sticky sessions (or the Redis adapter above) are required at the load balancer level so a player's WebSocket connection consistently routes correctly across reconnects.
