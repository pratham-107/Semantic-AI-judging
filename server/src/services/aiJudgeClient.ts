export interface ScoreGuessResult {
  similarity: number;
  isCorrect: boolean;
  warmth: number;
}

export class AIJudgeClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Pre-embeds and caches the secret answer for the round.
   */
  async cacheRoundAnswer(roundId: string, answer: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/embed-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId, answer }),
      });
      return res.ok;
    } catch (err: unknown) {
      console.warn(`[AIJudgeClient] Failed to cache embedding for round ${roundId}:`, (err as Error).message);
      return false;
    }
  }

  /**
   * Scores a guess against the round answer via semantic embedding similarity.
   */
  async scoreGuess(guess: string, answer: string, roundId?: string): Promise<ScoreGuessResult> {
    const cleanedGuess = guess.trim().toLowerCase();
    const cleanedAnswer = answer.trim().toLowerCase();

    // Fast path: Exact string match
    if (cleanedGuess === cleanedAnswer) {
      return {
        similarity: 1.0,
        isCorrect: true,
        warmth: 100,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/score-guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess: cleanedGuess, answer: cleanedAnswer, roundId }),
      });

      if (res.ok) {
        const data = await res.json() as { similarity: number; isCorrect: boolean; warmth: number };
        return {
          similarity: data.similarity,
          isCorrect: data.isCorrect,
          warmth: data.warmth,
        };
      }
    } catch (err: unknown) {
      console.warn('[AIJudgeClient] AI microservice call failed, using fallback similarity matcher:', (err as Error).message);
    }

    // Fallback heuristic scoring if AI service is temporarily offline
    return this.fallbackSimilarity(cleanedGuess, cleanedAnswer);
  }

  /**
   * Fallback character-level / substring similarity when AI service is unavailable.
   */
  private fallbackSimilarity(guess: string, answer: string): ScoreGuessResult {
    if (guess === answer) {
      return { similarity: 1.0, isCorrect: true, warmth: 100 };
    }

    if (guess.includes(answer) || answer.includes(guess)) {
      const sim = Math.min(guess.length, answer.length) / Math.max(guess.length, answer.length);
      const scaled = Math.min(0.94, sim * 0.9);
      return {
        similarity: Number(scaled.toFixed(2)),
        isCorrect: false,
        warmth: Math.round(scaled * 100),
      };
    }

    // Simple Levenshtein distance similarity
    const distance = this.levenshtein(guess, answer);
    const maxLen = Math.max(guess.length, answer.length);
    const sim = maxLen === 0 ? 1 : Math.max(0, 1 - distance / maxLen);
    const isCorrect = sim >= 0.95;

    return {
      similarity: Number(sim.toFixed(2)),
      isCorrect,
      warmth: Math.round(sim * 100),
    };
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}

export const aiJudgeClient = new AIJudgeClient();
