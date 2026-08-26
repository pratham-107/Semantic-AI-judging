import logging
import numpy as np
from typing import Dict, Optional
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("ai_service.model")

class EmbeddingModelManager:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        self._cache: Dict[str, np.ndarray] = {}  # key: round_id or word, val: embedding vector

    def load_model(self):
        if self.model is None:
            logger.info(f"Loading sentence-transformer model: {self.model_name}...")
            self.model = SentenceTransformer(self.model_name)
            logger.info("SentenceTransformer model loaded successfully.")

    def get_embedding(self, text: str) -> np.ndarray:
        if self.model is None:
            self.load_model()
        cleaned_text = text.strip().lower()
        embedding = self.model.encode(cleaned_text, normalize_embeddings=True)
        return np.array(embedding, dtype=np.float32)

    def cache_answer(self, round_id: str, answer: str) -> None:
        cleaned_answer = answer.strip().lower()
        embedding = self.get_embedding(cleaned_answer)
        self._cache[round_id] = embedding
        self._cache[cleaned_answer] = embedding
        logger.info(f"Cached embedding for round '{round_id}' (word: '{cleaned_answer}')")

    def get_cached_or_compute_answer_embedding(self, answer: str, round_id: Optional[str] = None) -> np.ndarray:
        cleaned_answer = answer.strip().lower()
        if round_id and round_id in self._cache:
            return self._cache[round_id]
        if cleaned_answer in self._cache:
            return self._cache[cleaned_answer]
        
        embedding = self.get_embedding(cleaned_answer)
        if round_id:
            self._cache[round_id] = embedding
        self._cache[cleaned_answer] = embedding
        return embedding

    def compute_similarity(self, guess: str, answer: str, round_id: Optional[str] = None) -> float:
        cleaned_guess = guess.strip().lower()
        cleaned_answer = answer.strip().lower()

        # Exact match fast-path
        if cleaned_guess == cleaned_answer:
            return 1.0

        guess_vec = self.get_embedding(cleaned_guess)
        answer_vec = self.get_cached_or_compute_answer_embedding(cleaned_answer, round_id)

        # Dot product for normalized vectors is cosine similarity
        similarity = float(np.dot(guess_vec, answer_vec))
        # Clamp to [0.0, 1.0] range
        similarity = max(0.0, min(1.0, similarity))
        return similarity

    def clear_cache(self, round_id: Optional[str] = None) -> None:
        if round_id:
            self._cache.pop(round_id, None)
        else:
            self._cache.clear()

model_manager = EmbeddingModelManager()
