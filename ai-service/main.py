import os
import logging
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from model import model_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load model on startup
    logger.info("Initializing embedding model...")
    model_manager.load_model()
    logger.info("AI Judge Service is ready to score guesses.")
    yield
    model_manager.clear_cache()

app = FastAPI(
    title="SketchAI AI Judging Service",
    description="Microservice providing semantic sentence-embedding scoring and warmth calculation for SketchAI.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScoreGuessRequest(BaseModel):
    guess: str = Field(..., description="The user's submitted guess text")
    answer: str = Field(..., description="The target secret answer word/phrase")
    roundId: Optional[str] = Field(None, description="Optional round ID for cached embedding lookup")

class ScoreGuessResponse(BaseModel):
    similarity: float = Field(..., description="Cosine similarity between 0.0 and 1.0")
    isCorrect: bool = Field(..., description="Whether the guess meets exact or near-synonym threshold")
    warmth: int = Field(..., description="Warmth score scaled between 0 and 100 for UI feedback")

class EmbedCacheRequest(BaseModel):
    answer: str = Field(..., description="The word to pre-embed and cache")
    roundId: str = Field(..., description="The round ID key")

class EmbedCacheResponse(BaseModel):
    status: str
    roundId: str

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "sketchai-ai-judge",
        "model": model_manager.model_name
    }

@app.post("/embed-cache", response_model=EmbedCacheResponse)
def embed_cache(payload: EmbedCacheRequest):
    if not payload.answer.strip() or not payload.roundId.strip():
        raise HTTPException(status_code=400, detail="answer and roundId must not be empty")
    model_manager.cache_answer(payload.roundId, payload.answer)
    return EmbedCacheResponse(status="cached", roundId=payload.roundId)

@app.post("/score-guess", response_model=ScoreGuessResponse)
def score_guess(payload: ScoreGuessRequest):
    guess = payload.guess.strip()
    answer = payload.answer.strip()

    if not guess or not answer:
        return ScoreGuessResponse(similarity=0.0, isCorrect=False, warmth=0)

    # Cleaned exact match check
    cleaned_guess = guess.lower()
    cleaned_answer = answer.lower()

    if cleaned_guess == cleaned_answer:
        return ScoreGuessResponse(similarity=1.0, isCorrect=True, warmth=100)

    similarity = model_manager.compute_similarity(guess, answer, round_id=payload.roundId)
    warmth = int(round(similarity * 100))

    # Threshold logic from SYSTEM_DESIGN.md:
    # similarity >= 0.95 OR exact match -> isCorrect: true
    # 0.75 <= similarity < 0.95 -> partial credit ("warm")
    is_correct = similarity >= 0.95

    return ScoreGuessResponse(
        similarity=round(similarity, 4),
        isCorrect=is_correct,
        warmth=warmth
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
