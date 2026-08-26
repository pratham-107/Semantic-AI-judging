import { v4 as uuidv4 } from 'uuid';
import {
  Room,
  CurrentRound,
  Player,
  PlayerScore,
  RoundEndPayload,
  GameEndPayload,
  DifficultyTier,
  CorrectGuesserInfo,
  GuessResultPayload,
} from '../types/room.types.js';
import { RoomService } from './roomService.js';
import { ScoringService } from './scoringService.js';
import { aiJudgeClient } from './aiJudgeClient.js';
import wordBankData from '../data/wordBank.json' with { type: 'json' };

// Map of active timer handles per roomCode
const activeTimers: Map<string, NodeJS.Timeout> = new Map();

export class RoundService {
  /**
   * Generates a masked hint string (e.g. "_ _ _ _ _" or "_ _ _   _ _ _").
   */
  public static generateWordHint(word: string): string {
    return word
      .split('')
      .map((char) => (char === ' ' ? '   ' : '_ '))
      .join('')
      .trim();
  }

  /**
   * Selects a random word from the word bank based on voted difficulty tier.
   */
  public static pickWordForRoom(room: Room): { word: string; category: string; difficulty: DifficultyTier } {
    let targetDifficulty: DifficultyTier = 'easy';

    if (room.difficultyVotes && Object.keys(room.difficultyVotes).length > 0) {
      const votes = Object.values(room.difficultyVotes);
      const counts: Record<string, number> = {};
      for (const vote of votes) {
        counts[vote] = (counts[vote] || 0) + 1;
      }
      let maxCount = 0;
      for (const [tier, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          targetDifficulty = tier as DifficultyTier;
        }
      }
    }

    const filtered = wordBankData.filter((w) => w.difficulty === targetDifficulty);
    const pool = filtered.length > 0 ? filtered : wordBankData;

    // Filter out words already used in previous rounds if possible
    const usedWords = new Set(room.roundHistory.map((r) => r.word.toLowerCase()));
    const unused = pool.filter((w) => !usedWords.has(w.word.toLowerCase()));
    const finalPool = unused.length > 0 ? unused : pool;

    const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
    return {
      word: chosen.word,
      category: chosen.category,
      difficulty: chosen.difficulty as DifficultyTier,
    };
  }

  /**
   * Starts the next round for a room.
   */
  public static async startNextRound(
    roomCode: string,
    onRoundTimeout: (roomCode: string) => Promise<void>
  ): Promise<{ room: Room; currentRound: CurrentRound; drawer: Player } | null> {
    const room = await RoomService.getRoom(roomCode);
    if (!room) return null;

    // Clear any previous timer
    if (activeTimers.has(roomCode)) {
      clearTimeout(activeTimers.get(roomCode)!);
      activeTimers.delete(roomCode);
    }

    const nextRoundNumber = (room.currentRound?.roundNumber ?? 0) + 1;

    // Find next drawer (rotate through connected players)
    const connectedPlayers = room.players.filter((p) => p.connected);
    if (connectedPlayers.length < 1) {
      room.status = 'WAITING';
      await RoomService.saveRoom(room);
      return null;
    }

    const previousDrawerIndex = room.players.findIndex((p) => p.isDrawer);
    // Reset all drawer flags
    room.players.forEach((p) => (p.isDrawer = false));

    let nextDrawerIndex = (previousDrawerIndex + 1) % room.players.length;
    while (!room.players[nextDrawerIndex].connected) {
      nextDrawerIndex = (nextDrawerIndex + 1) % room.players.length;
    }

    const drawer = room.players[nextDrawerIndex];
    drawer.isDrawer = true;

    const chosen = this.pickWordForRoom(room);
    const wordHint = this.generateWordHint(chosen.word);
    const now = Date.now();
    const durationMs = (room.settings.roundDurationSec || 80) * 1000;
    const endsAt = now + durationMs;
    const roundId = `${roomCode}-r${nextRoundNumber}`;

    const currentRound: CurrentRound = {
      roundNumber: nextRoundNumber,
      drawerId: drawer.id,
      word: chosen.word,
      wordHint,
      category: chosen.category,
      difficulty: chosen.difficulty,
      startedAt: now,
      endsAt,
      correctGuessers: [],
      revealedFogRegions: [],
    };

    room.status = 'IN_PROGRESS';
    room.currentRound = currentRound;
    await RoomService.saveRoom(room);

    // Cache embedding asynchronously
    aiJudgeClient.cacheRoundAnswer(roundId, chosen.word);

    // Set server-side authoritative timer
    const timer = setTimeout(async () => {
      activeTimers.delete(roomCode);
      await onRoundTimeout(roomCode);
    }, durationMs);

    activeTimers.set(roomCode, timer);

    return { room, currentRound, drawer };
  }

  /**
   * Processes a player guess.
   */
  public static async processGuess(
    roomCode: string,
    playerId: string,
    guessText: string
  ): Promise<{
    room: Room;
    guessResult: GuessResultPayload;
    correctAnnounce?: CorrectGuesserInfo;
    shouldEndRound: boolean;
  } | null> {
    const room = await RoomService.getRoom(roomCode);
    if (!room || !room.currentRound || room.status !== 'IN_PROGRESS') {
      return null;
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.isDrawer) {
      return null; // Drawer cannot guess
    }

    // Check if player has already guessed correctly this round
    const alreadyCorrect = room.currentRound.correctGuessers.some((g) => g.playerId === playerId);
    if (alreadyCorrect) {
      return {
        room,
        guessResult: {
          playerId,
          similarity: 1.0,
          warmth: 100,
          correct: true,
          pointsAwarded: 0,
          message: 'You have already guessed the word!',
        },
        shouldEndRound: false,
      };
    }

    const roundId = `${roomCode}-r${room.currentRound.roundNumber}`;
    const scoreResult = await aiJudgeClient.scoreGuess(guessText, room.currentRound.word, roundId);

    const now = Date.now();
    const timeTakenSec = Math.max(1, Math.round((now - room.currentRound.startedAt) / 1000));
    let pointsAwarded = 0;
    let correctAnnounce: CorrectGuesserInfo | undefined;
    let shouldEndRound = false;

    if (scoreResult.isCorrect) {
      const isFirst = room.currentRound.correctGuessers.length === 0;
      pointsAwarded = ScoringService.calculateGuesserPoints(
        timeTakenSec,
        room.settings.roundDurationSec,
        isFirst
      );

      player.score += pointsAwarded;

      correctAnnounce = {
        playerId: player.id,
        playerName: player.name,
        timeTakenSec,
        pointsAwarded,
        timestamp: now,
      };

      room.currentRound.correctGuessers.push(correctAnnounce);

      // Check if all guessers (total connected players - 1) have guessed correctly
      const totalGuessers = room.players.filter((p) => p.connected && !p.isDrawer).length;
      if (room.currentRound.correctGuessers.length >= totalGuessers) {
        shouldEndRound = true;
      }
    } else if (scoreResult.similarity >= 0.75) {
      // Partial credit for near miss
      pointsAwarded = ScoringService.calculatePartialCreditPoints(scoreResult.similarity);
      player.score += pointsAwarded;
    }

    await RoomService.saveRoom(room);

    return {
      room,
      guessResult: {
        playerId,
        similarity: scoreResult.similarity,
        warmth: scoreResult.warmth,
        correct: scoreResult.isCorrect,
        pointsAwarded,
      },
      correctAnnounce,
      shouldEndRound,
    };
  }

  /**
   * Ends the current round and calculates drawer accuracy scoring.
   */
  public static async endRound(roomCode: string): Promise<{
    room: Room;
    roundEndPayload: RoundEndPayload;
    gameEndPayload?: GameEndPayload;
  } | null> {
    const room = await RoomService.getRoom(roomCode);
    if (!room || !room.currentRound) return null;

    if (activeTimers.has(roomCode)) {
      clearTimeout(activeTimers.get(roomCode)!);
      activeTimers.delete(roomCode);
    }

    const currentRound = room.currentRound;
    const drawer = room.players.find((p) => p.id === currentRound.drawerId);
    const drawerName = drawer ? drawer.name : 'Unknown';

    const connectedGuessers = room.players.filter((p) => p.connected && p.id !== currentRound.drawerId);
    const totalGuessers = Math.max(1, connectedGuessers.length);
    const correctCount = currentRound.correctGuessers.length;

    const avgTimeTakenSec =
      correctCount > 0
        ? currentRound.correctGuessers.reduce((sum, g) => sum + g.timeTakenSec, 0) / correctCount
        : room.settings.roundDurationSec;

    // Compute Drawer Accuracy Score
    const { drawerScore, participationRatio, speedFactor } = ScoringService.calculateDrawerAccuracyScore(
      correctCount,
      totalGuessers,
      avgTimeTakenSec,
      room.settings.roundDurationSec
    );

    if (drawer) {
      drawer.score += drawerScore;
    }

    // Record in round history
    room.roundHistory.push({
      roundNumber: currentRound.roundNumber,
      drawerId: currentRound.drawerId,
      word: currentRound.word,
      correctCount,
      drawerScore,
      avgGuessTimeSec: Number(avgTimeTakenSec.toFixed(1)),
    });

    const scores: PlayerScore[] = room.players
      .map((p) => ({
        playerId: p.id,
        playerName: p.name,
        roundScore:
          p.id === currentRound.drawerId
            ? drawerScore
            : (currentRound.correctGuessers.find((g) => g.playerId === p.id)?.pointsAwarded ?? 0),
        totalScore: p.score,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    const roundEndPayload: RoundEndPayload = {
      word: currentRound.word,
      scores,
      drawerBonus: drawerScore,
      drawerId: currentRound.drawerId,
      drawerName,
      stats: {
        correctCount,
        totalGuessers,
        avgTimeTakenSec: Number(avgTimeTakenSec.toFixed(1)),
        participationRatio,
        speedFactor,
      },
    };

    let gameEndPayload: GameEndPayload | undefined;

    // Check if max rounds reached
    if (currentRound.roundNumber >= room.settings.totalRounds) {
      room.status = 'FINISHED';
      gameEndPayload = {
        finalScores: scores,
        winner: scores[0],
      };
    }

    room.currentRound = null;
    await RoomService.saveRoom(room);

    return { room, roundEndPayload, gameEndPayload };
  }
}
