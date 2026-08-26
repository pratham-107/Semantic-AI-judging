export class ScoringService {
  public static readonly BASE_GUESSER_POINTS = 500;
  public static readonly FIRST_GUESSER_MULTIPLIER = 1.5;
  public static readonly MAX_DRAWER_POINTS = 800;

  /**
   * Calculates points for a correct guess based on time taken.
   */
  public static calculateGuesserPoints(
    timeTakenSec: number,
    roundDurationSec: number,
    isFirstCorrect: boolean = false
  ): number {
    const clampedTime = Math.max(0, Math.min(timeTakenSec, roundDurationSec));
    const timeFactor = 1 - clampedTime / roundDurationSec;
    const base = Math.floor(this.BASE_GUESSER_POINTS * Math.max(0.1, timeFactor));
    return isFirstCorrect ? Math.floor(base * this.FIRST_GUESSER_MULTIPLIER) : base;
  }

  /**
   * Calculates partial credit points for near-miss semantic guesses.
   * points = floor(basePoints * (similarity^2) * 0.25)
   */
  public static calculatePartialCreditPoints(similarity: number): number {
    if (similarity < 0.75 || similarity >= 0.95) return 0;
    // Squared similarity punishes vague guesses more than near misses
    const factor = Math.pow(similarity, 2);
    return Math.floor(this.BASE_GUESSER_POINTS * 0.25 * factor);
  }

  /**
   * Calculates drawer accuracy score based on participation ratio and average speed.
   * drawerScore = floor(maxDrawerPoints * participationRatio * (0.5 + 0.5 * speedFactor))
   */
  public static calculateDrawerAccuracyScore(
    correctCount: number,
    totalGuessers: number,
    avgTimeTakenSec: number,
    roundDurationSec: number
  ): {
    drawerScore: number;
    participationRatio: number;
    speedFactor: number;
  } {
    if (totalGuessers <= 0 || correctCount <= 0) {
      return {
        drawerScore: 0,
        participationRatio: 0,
        speedFactor: 0,
      };
    }

    const participationRatio = Math.min(1, correctCount / totalGuessers);
    const clampedAvgTime = Math.max(0, Math.min(avgTimeTakenSec, roundDurationSec));
    const speedFactor = 1 - clampedAvgTime / roundDurationSec;

    const drawerScore = Math.floor(
      this.MAX_DRAWER_POINTS * participationRatio * (0.5 + 0.5 * speedFactor)
    );

    return {
      drawerScore,
      participationRatio: Number(participationRatio.toFixed(3)),
      speedFactor: Number(speedFactor.toFixed(3)),
    };
  }
}
