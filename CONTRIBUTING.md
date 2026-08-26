# Contributing

This is currently a solo portfolio project, but this file documents the conventions used so the repo reads as a real engineering project rather than a one-off script dump.

## Branch naming

```
feature/<short-description>   e.g. feature/fog-of-war-reveal
fix/<short-description>        e.g. fix/reconnect-race-condition
chore/<short-description>      e.g. chore/update-deps
```

## Commit style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add server-side fog of war filtering
fix: prevent duplicate score submission on reconnect
docs: update API spec with embed-cache endpoint
refactor: extract scoring formulas into scoring.service.ts
```

## Code organization

- `client/` — components stay small and presentational; game state lives in a single WebSocket context provider, not scattered `useState` calls
- `server/` — WebSocket event handlers stay thin; business logic (scoring, room lifecycle) lives in separate service modules so it's unit-testable without a live socket connection
- `ai-service/` — the embedding model loads once at startup, not per-request

## Testing priorities (if time allows)

1. Scoring formulas (pure functions — easiest and highest-value to test)
2. Room state transitions (join/leave/host migration edge cases)
3. Fog of War region math

## Environment

Copy `.env.example` to `.env` in each service directory before running locally. Never commit real `.env` files or API keys.
