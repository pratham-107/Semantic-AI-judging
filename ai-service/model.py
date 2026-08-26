import logging
import numpy as np
from typing import Dict, Optional

logger = logging.getLogger("ai_service.model")

class EmbeddingModelManager:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.is_fastembed = False
        self._cache: Dict[str, np.ndarray] = {}

    def load_model(self):
        if self.model is not None:
            return

        try:
            # 1. Try FastEmbed (ONNX Runtime, ultra-low ~80MB RAM, no PyTorch bloat)
            from fastembed import TextEmbedding
            logger.info(f"Loading FastEmbed model: {self.model_name} (ultra-low memory mode)...")
            self.model = TextEmbedding(model_name=self.model_name)
            self.is_fastembed = True
            logger.info("FastEmbed model loaded successfully (~80MB RAM footprint).")
        except Exception as e:
            logger.warning(f"FastEmbed load failed ({e}), attempting sentence_transformers fallback...")
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(self.model_name)
                self.is_fastembed = False
                logger.info("SentenceTransformer model loaded successfully.")
            except Exception as e2:
                logger.error(f"Failed to load any embedding model: {e2}")

    def get_embedding(self, text: str) -> np.ndarray:
        if self.model is None:
            self.load_model()

        cleaned_text = text.strip().lower()

        if self.is_fastembed:
            # FastEmbed returns an iterator of numpy arrays (already normalized)
            embeddings = list(self.model.embed([cleaned_text]))
            vec = embeddings[0]
            norm = np.linalg.norm(vec)
            return vec / norm if norm > 0 else vec
        else:
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

        # Fast path exact match
        if cleaned_guess == cleaned_answer:
            return 1.0

        guess_vec = self.get_embedding(cleaned_guess)
        answer_vec = self.get_cached_or_compute_answer_embedding(cleaned_answer, round_id)

        # Cosine similarity
        similarity = float(np.dot(guess_vec, answer_vec))
        return max(0.0, min(1.0, similarity))

    def clear_cache(self, round_id: Optional[str] = None) -> None:
        if round_id:
            self._cache.pop(round_id, None)
        else:
            self._cache.clear()

model_manager = EmbeddingModelManager()
