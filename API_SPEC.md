# API Spec

Quick reference for all WebSocket events and REST endpoints. Full rationale and data model in [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md).

---

## WebSocket — namespace `/game`

### Client → Server

| Event | Payload | Notes |
|---|---|---|
| `room:create` | `{ playerName: string, settings: RoomSettings }` | Returns `roomCode` |
| `room:join` | `{ roomCode: string, playerName: string }` | Fails with `error` if room full/not found |
| `room:leave` | `{}` | — |
| `room:startGame` | `{}` | Host-only |
| `difficulty:vote` | `{ tier: "easy" \| "medium" \| "hard" \| "absurd" }` | Per-player vote, majority wins next round |
| `stroke:draw` | `{ x: number, y: number, prevX: number, prevY: number, color: string, width: number }` | Drawer only |
| `stroke:clear` | `{}` | Drawer only |
| `guess:submit` | `{ text: string }` | Guessers only, ignored if sender is current drawer |

```ts
interface RoomSettings {
  maxPlayers: number;       // default 8
  totalRounds: number;      // default 5
  roundDurationSec: number; // default 80
  difficultyVoting: boolean;
}
```

### Server → Client

| Event | Payload | Notes |
|---|---|---|
| `room:state` | `Room` (full object) | Sent on join/reconnect/any state change |
| `round:start` | `{ roundNumber, drawerId, wordHint, endsAt }` | Only drawer gets real word (separate private event) |
| `round:startDrawer` | `{ word: string }` | Private, drawer only |
| `stroke:broadcast` | `{ playerId, x, y, prevX, prevY, color, width }` | Fog-filtered per recipient |
| `guess:result` | `{ warmth: number (0-100), correct: boolean, pointsAwarded: number }` | Private, to the guesser only |
| `guess:correctAnnounce` | `{ playerId, playerName, timeTakenSec }` | Broadcast, does not reveal guess content |
| `round:end` | `{ word, scores: PlayerScore[], drawerBonus: number }` | — |
| `game:end` | `{ finalScores: PlayerScore[] }` | — |
| `error` | `{ code: string, message: string }` | Auth failure, room full, invalid state transition, etc. |

```ts
interface PlayerScore {
  playerId: string;
  playerName: string;
  roundScore: number;
  totalScore: number;
}
```

---

## REST — AI Judging Service (FastAPI)

### `POST /score-guess`

Request:
```json
{ "guess": "puppy", "answer": "dog" }
```

Response:
```json
{
  "similarity": 0.82,
  "isCorrect": false,
  "warmth": 82
}
```

Thresholds (server-configurable):
- `similarity >= 0.95` OR normalized exact match → `isCorrect: true`
- `0.75 <= similarity < 0.95` → partial credit, `isCorrect: false`
- `< 0.75` → no points, warmth only

### `POST /embed-cache` *(internal, called once per round)*

Pre-computes and caches the embedding for the round's answer word so per-guess scoring doesn't re-embed the answer every time.

```json
{ "answer": "elephant", "roundId": "uuid" }
```

---

## REST — Game Server (Node/Express)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/guest` | Issues short-lived JWT for anonymous play (name only, no signup) |
| `POST` | `/auth/register` | Optional persistent account (email/password, BCrypt) |
| `POST` | `/auth/login` | Returns JWT for existing account |
| `GET` | `/leaderboard` | Top players by cumulative score (requires persistent accounts) |
| `GET` | `/match/:id` | Match history detail (rounds, scores) — reads from Postgres |

All WebSocket connections authenticate via JWT passed in the connection handshake (`auth: { token }`).
