# SketchAI — System Design Spec (v1 MVP)

A real-time multiplayer drawing & guessing game with AI-based semantic scoring, drawer accuracy scoring, and Fog of War canvas reveal.

**Stack:** React/Next.js (client) · Node.js/Express + WebSockets (game server) · FastAPI (AI microservice) · Redis (room state) · PostgreSQL (persistent match history)

---

## 1. High-Level Architecture

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

**Why this split:**
- **Redis** holds ephemeral, high-churn state (who's in a room, current round, live scores) — fast reads/writes, and rooms naturally expire (TTL) when abandoned.
- **Postgres** holds durable data (user accounts, completed match history, leaderboards) — the stuff you actually want to query later.
- **FastAPI** is isolated as its own service so the AI/embedding logic can be swapped, scaled, or rate-limited independently of the real-time game loop. It's a clean example of polyglot service design for your resume story.

---

## 2. Room & Session Model

### Room lifecycle
```
CREATED → WAITING (players joining) → IN_PROGRESS (rounds running) → FINISHED → (expired/cleaned up)
```

### Room object (stored in Redis, key: `room:{roomCode}`)
```json
{
  "roomCode": "AB3XQ",
  "hostId": "player_uuid",
  "status": "WAITING | IN_PROGRESS | FINISHED",
  "settings": {
    "maxPlayers": 8,
    "totalRounds": 5,
    "roundDurationSec": 80,
    "difficultyVoting": true
  },
  "players": [
    {
      "id": "player_uuid",
      "name": "Pratham",
      "connected": true,
      "score": 0,
      "isDrawer": false
    }
  ],
  "currentRound": {
    "roundNumber": 2,
    "drawerId": "player_uuid",
    "word": "elephant",
    "startedAt": 1735200000,
    "endsAt": 1735200080,
    "correctGuessers": ["player_uuid_2"],
    "revealedFogRegions": [ [x, y, radius], ... ]
  },
  "createdAt": 1735199000
}
```

**Design decisions:**
- **Room code**: 5-char alphanumeric, generated server-side, collision-checked against Redis before assigning.
- **TTL**: room key set to expire (e.g., 2 hours of inactivity) so abandoned rooms don't leak memory — no manual cleanup job needed.
- **Host migration**: if the host disconnects, server promotes the next-connected player to host (don't let a dead room happen because one person closed their laptop).
- **Server is authoritative**: the client never decides who guessed correctly, what the score is, or when a round ends — it only sends *intents* (`guess:submit`, `stroke:draw`) and the server broadcasts the *resulting truth*. This is the single most important rule for avoiding cheating and desync bugs.

---

## 3. WebSocket Event Schema

All events go through a single Socket.io namespace (`/game`). Naming convention: `domain:action`.

### Client → Server events

| Event | Payload | Description |
|---|---|---|
| `room:create` | `{ playerName, settings }` | Creates a room, returns room code |
| `room:join` | `{ roomCode, playerName }` | Joins existing room |
| `room:leave` | `{}` | Leaves current room |
| `room:startGame` | `{}` | Host-only; begins round 1 |
| `difficulty:vote` | `{ tier: "easy"\|"medium"\|"hard"\|"absurd" }` | Vote for next round's difficulty |
| `stroke:draw` | `{ x, y, prevX, prevY, color, width }` | Drawer's live stroke segment |
| `stroke:clear` | `{}` | Drawer clears canvas |
| `guess:submit` | `{ text }` | Guesser submits a guess |

### Server → Client events

| Event | Payload | Description |
|---|---|---|
| `room:state` | full room object | Sent on join/reconnect and after any state change |
| `round:start` | `{ roundNumber, drawerId, wordHint, endsAt }` | New round begins. **Only the drawer receives the actual word**; everyone else gets a masked hint (`"_ _ _ _ _"`) |
| `stroke:broadcast` | `{ playerId, x, y, prevX, prevY, color, width }` | Relayed stroke to all guessers (filtered by Fog of War, see §5) |
| `guess:result` | `{ playerId, warmth: 0-100, correct: bool }` | Sent to the guesser privately — their own warmth/correctness |
| `guess:correctAnnounce` | `{ playerId, playerName, timeTakenSec }` | Broadcast to room (without revealing the word to others still guessing) |
| `round:end` | `{ word, scores: [...], drawerBonus }` | Round over — reveals word, updated leaderboard |
| `game:end` | `{ finalScores: [...] }` | Match complete |
| `error` | `{ code, message }` | Auth failures, invalid room code, room full, etc. |

**Key design choice:** guess correctness/warmth is sent **privately** to the guesser (`guess:result`), not broadcast — otherwise players could see each other's warmth scores and reverse-engineer the answer collaboratively without actually knowing it. Only the *fact* that someone guessed correctly is broadcast (`guess:correctAnnounce`), not their guess content or score.

---

## 4. Scoring System

### 4.1 Semantic guess scoring (via FastAPI AI service)

For every submitted guess, the Node server calls the AI microservice:

```
POST /score-guess
{
  "guess": "puppy",
  "answer": "dog"
}

→ Response:
{
  "similarity": 0.82,        // cosine similarity, 0.0–1.0
  "isCorrect": false,        // true if similarity >= exact-match threshold OR string match
  "warmth": 82                // similarity scaled to 0–100 for UI display
}
```

**Correctness threshold logic** (tunable):
- `similarity >= 0.95` OR normalized string match → `isCorrect: true`, full points
- `0.75 <= similarity < 0.95` → "warm" — partial credit points, round continues for that player (they haven't "won" the round but banked some points)
- `< 0.75` → no points, just warmth feedback

Partial credit points formula:
```
points_awarded = floor(basePoints * similarity^2)
```
(Squaring the similarity punishes vague guesses more than it rewards near-misses — keeps "just spam similar words" from being a viable strategy.)

**Implementation note:** use a lightweight sentence-embedding model (e.g., `all-MiniLM-L6-v2` via `sentence-transformers`) rather than calling a large LLM per guess — you'll get guesses at high frequency (every keystroke-debounced submission from every player), so latency and cost matter. Cache embeddings for the round's answer word once per round rather than re-embedding it on every guess.

### 4.2 Guesser speed scoring

```
points = floor(basePoints * (1 - (timeTaken / roundDuration)) )
```
First correct guesser gets a bonus multiplier (e.g., ×1.5) on top.

### 4.3 Drawer accuracy scoring (the core original mechanic)

Instead of a flat "you get points if anyone guesses right," the drawer's score is a function of **how many** players got it and **how fast on average**:

```
correctCount = number of players who guessed correctly this round
totalGuessers = totalPlayers - 1 (excluding drawer)
avgTimeTaken = mean(timeTaken for all correct guesses)

participationRatio = correctCount / totalGuessers        // 0.0–1.0
speedFactor = 1 - (avgTimeTaken / roundDuration)          // 0.0–1.0

drawerScore = floor(maxDrawerPoints * participationRatio * (0.5 + 0.5 * speedFactor))
```

This means: a drawing that only 1 of 6 people guessed (even if fast) scores far lower than a drawing that 5 of 6 people guessed at moderate speed. It directly rewards *clarity* over *lucky fast guesses*, which is the whole point of the twist — worth stating explicitly in your README so interviewers immediately get why it's different from vanilla skribbl.io scoring.

---

## 5. Fog of War Reveal Logic

- Server tracks `revealedFogRegions` in the round state — a list of `(x, y, radius)` circles.
- Every stroke event, the server adds a small revealed circle around the stroke's coordinates (radius grows slowly over time, e.g., `+2px` every 5 seconds elapsed, so late in the round more of the canvas is visible even without recent strokes near it — prevents the round becoming unsolvable).
- The server sends **guessers** only the strokes that fall within a currently-revealed region; the **drawer** always sees the full canvas (their own view is never fogged).
- This filtering happens server-side, not client-side — critical, because a client-side-only fog would just be cosmetic and a technical guesser could inspect network traffic to see full stroke data. Doing the filtering in the WebSocket relay layer is the actual "hard part" worth highlighting.

---

## 6. Data Model (Postgres — durable storage)

```sql
users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMP
)

matches (
  id UUID PRIMARY KEY,
  room_code TEXT,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  total_rounds INT
)

match_players (
  match_id UUID REFERENCES matches(id),
  user_id UUID REFERENCES users(id),
  final_score INT,
  rank INT
)

rounds (
  id UUID PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  round_number INT,
  drawer_id UUID REFERENCES users(id),
  word TEXT,
  correct_guessers_count INT,
  avg_guess_time_sec FLOAT,
  drawer_score INT
)
```

Redis holds the *live* game; Postgres only gets written to at round-end / match-end (async, non-blocking) — so a Postgres hiccup never stalls real-time gameplay.

---

## 7. Auth (keep it simple for v1)

- Anonymous play is fine for MVP: player picks a display name, server issues a short-lived JWT scoped to that room session (no signup required to play).
- Optional persistent accounts (JWT with BCrypt, matching what you already know from your resume) unlock leaderboard history — build this only after the core game loop works.

---

## 8. Suggested Build Order (recap, now concrete)

1. **Room plumbing**: `room:create`, `room:join`, Redis room storage, reconnect handling — no drawing/game logic yet. Test with two browser tabs.
2. **Canvas stroke sync**: `stroke:draw` → `stroke:broadcast`, no fog, no scoring. This alone is demoable.
3. **Basic round loop**: word assignment, timer, exact-match guess checking, simple scoring, `round:end`/`game:end`. Full game loop works end-to-end now.
4. **AI judging swap-in**: stand up the FastAPI `/score-guess` endpoint, replace exact-match with similarity scoring + warmth.
5. **Drawer accuracy formula**: implement the participation/speed formula at `round:end`.
6. **Fog of War**: add server-side region filtering to the stroke broadcast pipeline.
7. **Deploy**: Node server + Redis on Railway/Render, FastAPI as a separate service, Postgres via Supabase (you already know it), client on Vercel.

---

## 9. What to say about this project in interviews

Two sentences worth memorizing, since this is the crux of what makes it "yours":

- *"The drawer's score is a function of how many players correctly identified the drawing and how fast, not a flat reward — so the scoring system rewards clarity of communication, not just speed."*
- *"Guess correctness uses semantic similarity via sentence embeddings rather than exact string matching, and the Fog of War reveal is filtered server-side per-client so it can't be bypassed by inspecting network traffic — the server is the sole source of truth for both game state and vision."*

That's a concrete, defensible systems-design story — not "I built a chat app with a canvas."
