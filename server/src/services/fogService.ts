import { FogRegion, StrokeData } from '../types/room.types.js';

export class FogService {
  public static readonly BASE_REVEAL_RADIUS = 45;
  public static readonly TIME_EXPANSION_RATE = 2.0; // +2px per 5 seconds

  /**
   * Calculates the effective radius based on elapsed time in the round.
   */
  public static getDynamicRadius(elapsedSec: number): number {
    const growth = Math.floor(elapsedSec / 5) * this.TIME_EXPANSION_RATE;
    return this.BASE_REVEAL_RADIUS + growth;
  }

  /**
   * Adds or updates a revealed region given a new stroke point.
   */
  public static addRevealedPoint(
    existingRegions: FogRegion[],
    x: number,
    y: number,
    elapsedSec: number
  ): FogRegion[] {
    const radius = this.getDynamicRadius(elapsedSec);

    // Merge if very close to an existing region to prevent runaway array size
    const mergeThreshold = radius * 0.4;
    const nearbyIndex = existingRegions.findIndex(
      (r) => Math.hypot(r.x - x, r.y - y) < mergeThreshold
    );

    if (nearbyIndex !== -1) {
      // Slightly expand the existing region
      existingRegions[nearbyIndex].radius = Math.max(
        existingRegions[nearbyIndex].radius,
        radius
      );
      return existingRegions;
    }

    existingRegions.push({ x, y, radius });
    return existingRegions;
  }

  /**
   * Checks if a point (x, y) is inside any revealed fog region.
   */
  public static isPointRevealed(
    x: number,
    y: number,
    revealedRegions: FogRegion[]
  ): boolean {
    if (revealedRegions.length === 0) return true; // If fog disabled or empty
    return revealedRegions.some(
      (region) => Math.hypot(region.x - x, region.y - y) <= region.radius
    );
  }

  /**
   * Checks whether a stroke segment is visible within the revealed fog regions.
   */
  public static isStrokeVisible(
    stroke: StrokeData,
    revealedRegions: FogRegion[]
  ): boolean {
    if (!revealedRegions || revealedRegions.length === 0) return true;
    return (
      this.isPointRevealed(stroke.x, stroke.y, revealedRegions) ||
      this.isPointRevealed(stroke.prevX, stroke.prevY, revealedRegions)
    );
  }

  /**
   * Filters an array of strokes, returning only those visible to guessers.
   */
  public static filterStrokesForGuesser(
    strokes: StrokeData[],
    revealedRegions: FogRegion[]
  ): StrokeData[] {
    return strokes.filter((stroke) => this.isStrokeVisible(stroke, revealedRegions));
  }
}
