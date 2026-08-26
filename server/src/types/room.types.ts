export type RoomStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'absurd';

export interface RoomSettings {
  maxPlayers: number;        // default: 8
  totalRounds: number;       // default: 5
  roundDurationSec: number;  // default: 80
  difficultyVoting: boolean; // default: true
}

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  score: number;
  isDrawer: boolean;
  socketId?: string;
  avatarSeed?: string;
}

export interface FogRegion {
  x: number;
  y: number;
  radius: number;
}

export interface CorrectGuesserInfo {
  playerId: string;
  playerName: string;
  timeTakenSec: number;
  pointsAwarded: number;
  timestamp: number;
}

export interface CurrentRound {
  roundNumber: number;
  drawerId: string;
  word: string;
  wordHint: string;
  category?: string;
  difficulty?: DifficultyTier;
  startedAt: number;
  endsAt: number;
  correctGuessers: CorrectGuesserInfo[];
  revealedFogRegions: FogRegion[];
}

export interface Room {
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: Player[];
  currentRound: CurrentRound | null;
  roundHistory: Array<{
    roundNumber: number;
    drawerId: string;
    word: string;
    correctCount: number;
    drawerScore: number;
    avgGuessTimeSec: number;
  }>;
  difficultyVotes?: Record<string, DifficultyTier>;
  createdAt: number;
  updatedAt: number;
}

export interface StrokeData {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  color: string;
  width: number;
  isNewStroke?: boolean;
}

export interface GuessResultPayload {
  playerId: string;
  similarity: number;
  warmth: number;
  correct: boolean;
  pointsAwarded: number;
  message?: string;
}

export interface PlayerScore {
  playerId: string;
  playerName: string;
  roundScore: number;
  totalScore: number;
}

export interface RoundEndPayload {
  word: string;
  scores: PlayerScore[];
  drawerBonus: number;
  drawerId: string;
  drawerName: string;
  stats: {
    correctCount: number;
    totalGuessers: number;
    avgTimeTakenSec: number;
    participationRatio: number;
    speedFactor: number;
  };
}

export interface GameEndPayload {
  finalScores: PlayerScore[];
  winner: PlayerScore;
}
