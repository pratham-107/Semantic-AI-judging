# SketchAI

A real-time multiplayer drawing & guessing game — like Pictionary or skribbl.io, but with **AI-powered semantic guess judging**, a **drawer accuracy scoring system** that rewards clear drawing over lucky fast guessing, and **server-authoritative Fog of War**.

🎮 **[Live Demo](https://semantic-ai-judging-frontend.vercel.app/)** · 📐 [System Design](./SYSTEM_DESIGN.md) · 📡 [API Spec](./API_SPEC.md) · 🗺️ [Architecture](./ARCHITECTURE.md)

---

## 🌟 Live Deployments

- **Frontend Client (Vercel):** [https://semantic-ai-judging-frontend.vercel.app](https://semantic-ai-judging-frontend.vercel.app/)
- **Game Server (Render):** [https://sketchai-game-server.onrender.com](https://sketchai-game-server.onrender.com/health)
- **AI Judging Service (Render):** [https://semantic-ai-judging.onrender.com](https://semantic-ai-judging.onrender.com/health)

---

## What makes this different

Most drawing-game clones score guesses with exact string matching and reward the drawer with a flat point value whenever *anyone* gets it right. SketchAI changes both:

- **Semantic guess scoring** — guesses are scored by meaning using sentence embeddings (`all-MiniLM-L6-v2` via FastEmbed/ONNX), not exact text match. Guessing "puppy" for "dog" gets 80% warmth and partial credit, not silence.
- **Drawer accuracy scoring** — the drawer's score is a function of *how many* players correctly guessed and *how fast on average*, not a flat reward:
  $$\text{drawerScore} = \lfloor \text{maxPoints} \times \text{participationRatio} \times (0.5 + 0.5 \times \text{speedFactor}) \rfloor$$
- **Fog of War reveal** — guessers only see the canvas within regions revealed by recent strokes, filtered **server-side**, so it can't be bypassed by inspecting network traffic.
- **Lo-Fi Classroom Soundtrack & SFX** — Procedural Web Audio API sound generator with lo-fi background music, school bells, and triumph chimes.

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React / Next.js (App Router), Tailwind CSS, Framer Motion, Web Audio API, Socket.io-client |
| **Game Server** | Node.js, Express, Socket.io (WebSockets), TypeScript |
| **AI Judging Service** | Python, FastAPI, FastEmbed / Sentence-Transformers (ONNX embeddings) |
| **Live State** | Redis (with in-memory fallback) |
| **Persistent Storage** | PostgreSQL (Supabase / Neon) |
| **Deployment** | Vercel (Client), Render (Node Game Server + FastAPI AI Service) |

---

## Features (v1 MVP)

- [x] Room creation/join via 5-letter room code, host controls, host migration
- [x] Real-time canvas stroke sync across all players with 60fps throttling
- [x] Round loop: drawer assignment, timer, word reveal on round end
- [x] AI-based semantic guess scoring with live thermometer warmth gauge
- [x] Drawer accuracy scoring formula (participation × speed)
- [x] Server-filtered Fog of War canvas reveal
- [x] Report card & final podium leaderboard with confetti celebration
- [x] Lo-Fi background music and interactive classroom SFX

---

## Getting Started Locally

```bash
# 1. AI judging service
cd ai-service
.\.venv\Scripts\activate
uvicorn main:app --port 8000 --reload

# 2. Game server
cd server
npm install
npm run dev

# 3. Client
cd client
npm install
npm run dev
```

Visit `http://localhost:3000` to test locally in two browser tabs.

---

## Project Structure

```
sketchai/
├── client/           # React/Next.js frontend with Framer Motion & Web Audio
├── server/           # Node/Express + Socket.io game server & PostgreSQL client
├── ai-service/       # FastAPI semantic scoring microservice (FastEmbed)
├── SYSTEM_DESIGN.md  # Full architecture, data model, scoring formulas
├── API_SPEC.md       # WebSocket event schema + REST endpoints
├── FRONTEND_UI.md    # Classroom UI design token system
├── ROADMAP.md         # MVP checklist and stretch goals
└── README.md
```

---

## License

MIT
