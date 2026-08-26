# SketchAI

A real-time multiplayer drawing & guessing game — like Pictionary or skribbl.io, but with **AI-powered semantic guess judging** and a **drawer accuracy scoring system** that rewards clear drawing over lucky fast guessing.

🎮 **[Live Demo](#)** · 📐 [System Design](./SYSTEM_DESIGN.md) · 📡 [API Spec](./API_SPEC.md) · 🗺️ [Roadmap](./ROADMAP.md)

---

## What makes this different

Most drawing-game clones score guesses with exact string matching and reward the drawer with a flat point value whenever *anyone* gets it right. SketchAI changes both:

- **Semantic guess scoring** — guesses are scored by meaning using sentence embeddings, not exact text match. Guessing "puppy" for "dog" gets partial credit and a live "warmth" indicator, not silence.
- **Drawer accuracy scoring** — the drawer's score is a function of *how many* players correctly guessed and *how fast on average*, not a flat reward. Draw clearly, score higher — not just draw fast.
- **Fog of War reveal** — guessers only see the canvas within regions revealed by recent strokes, filtered **server-side**, so it can't be bypassed by inspecting network traffic.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React / Next.js, Canvas API, Socket.io-client |
| Game Server | Node.js, Express, Socket.io (WebSockets) |
| AI Judging Service | Python, FastAPI, sentence-transformers (embeddings) |
| Live State | Redis |
| Persistent Storage | PostgreSQL |
| Deployment | Vercel (client), Railway/Render (Node + FastAPI), Supabase (Postgres) |

## Features (v1 MVP)

- [ ] Room creation/join via short room code, host controls
- [ ] Real-time canvas stroke sync across all players
- [ ] Round loop: drawer assignment, timer, word reveal on round end
- [ ] AI-based semantic guess scoring with live warmth feedback
- [ ] Drawer accuracy scoring formula (participation × speed)
- [ ] Server-filtered Fog of War canvas reveal
- [ ] Post-match leaderboard

See [ROADMAP.md](./ROADMAP.md) for the full checklist and planned v2 features (power-ups, twist rounds, AI-generated prompts, AI recap).

## Getting Started

> Setup instructions will be filled in once the initial scaffold is committed.

```bash
# Client
cd client && npm install && npm run dev

# Game server
cd server && npm install && npm run dev

# AI judging service
cd ai-service && pip install -r requirements.txt && uvicorn main:app --reload
```

Environment variables required — see `.env.example` in each service directory (to be added).

## Project Structure

```
sketchai/
├── client/          # React/Next.js frontend
├── server/          # Node/Express + Socket.io game server
├── ai-service/       # FastAPI semantic scoring microservice
├── SYSTEM_DESIGN.md  # Full architecture, data model, scoring formulas
├── API_SPEC.md        # WebSocket event schema + REST endpoints
├── ROADMAP.md          # MVP checklist and stretch goals
└── README.md
```

## License

MIT
