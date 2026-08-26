import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Room, GameEndPayload } from '../types/room.types.js';

const { Pool } = pg;

class DatabaseService {
  private pool: pg.Pool | null = null;
  private isConnected = false;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      });

      this.pool
        .connect()
        .then((client) => {
          console.log(' Connected to PostgreSQL database for match history.');
          this.isConnected = true;
          client.release();
          this.initTables();
        })
        .catch((err: Error) => {
          console.warn(' PostgreSQL connection failed (running without persistent DB):', err.message);
          this.isConnected = false;
        });
    } else {
      console.log('ℹ️ No DATABASE_URL provided — match history will remain in-memory.');
    }
  }

  private async initTables() {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS matches (
          id UUID PRIMARY KEY,
          room_code VARCHAR(10) NOT NULL,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          total_rounds INT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS match_players (
          id UUID PRIMARY KEY,
          match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
          player_id VARCHAR(64) NOT NULL,
          player_name VARCHAR(64) NOT NULL,
          final_score INT NOT NULL,
          rank INT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rounds (
          id UUID PRIMARY KEY,
          match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
          round_number INT NOT NULL,
          drawer_name VARCHAR(64) NOT NULL,
          word VARCHAR(64) NOT NULL,
          correct_guessers_count INT NOT NULL,
          avg_guess_time_sec FLOAT NOT NULL,
          drawer_score INT NOT NULL
        );
      `);
    } catch (err: unknown) {
      console.warn('Failed to auto-init Postgres tables:', (err as Error).message);
    }
  }

  /**
   * Asynchronously persists a completed match to PostgreSQL without blocking the game loop.
   */
  public async saveMatch(room: Room, gameEndData: GameEndPayload): Promise<void> {
    if (!this.pool || !this.isConnected) return;

    try {
      const matchId = uuidv4();
      const startedAt = new Date(room.createdAt);
      const endedAt = new Date();

      // 1. Insert Match
      await this.pool.query(
        `INSERT INTO matches (id, room_code, started_at, ended_at, total_rounds)
         VALUES ($1, $2, $3, $4, $5)`,
        [matchId, room.roomCode, startedAt, endedAt, room.settings.totalRounds]
      );

      // 2. Insert Players
      for (let i = 0; i < gameEndData.finalScores.length; i++) {
        const p = gameEndData.finalScores[i];
        await this.pool.query(
          `INSERT INTO match_players (id, match_id, player_id, player_name, final_score, rank)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), matchId, p.playerId, p.playerName, p.totalScore, i + 1]
        );
      }

      // 3. Insert Rounds
      for (const r of room.roundHistory) {
        const drawer = room.players.find((p) => p.id === r.drawerId);
        const drawerName = drawer ? drawer.name : 'Unknown';

        await this.pool.query(
          `INSERT INTO rounds (id, match_id, round_number, drawer_name, word, correct_guessers_count, avg_guess_time_sec, drawer_score)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [uuidv4(), matchId, r.roundNumber, drawerName, r.word, r.correctCount, r.avgGuessTimeSec, r.drawerScore]
        );
      }

      console.log(` Saved match ${matchId} (Room: ${room.roomCode}) to PostgreSQL.`);
    } catch (err: unknown) {
      console.warn('Failed to save match to PostgreSQL:', (err as Error).message);
    }
  }

  /**
   * Retrieves global match leaderboards.
   */
  public async getLeaderboard(limit = 10) {
    if (!this.pool || !this.isConnected) return [];
    try {
      const res = await this.pool.query(
        `SELECT player_name, MAX(final_score) as high_score, COUNT(*) as matches_played
         FROM match_players
         GROUP BY player_name
         ORDER BY high_score DESC
         LIMIT $1`,
        [limit]
      );
      return res.rows;
    } catch {
      return [];
    }
  }
}

export const dbService = new DatabaseService();
