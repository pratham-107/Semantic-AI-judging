import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Room, GameEndPayload } from '../types/room.types.js';

const { Pool } = pg;

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

class DatabaseService {
  private pool: pg.Pool | null = null;
  private isConnected = false;
  private memoryUsers: Map<string, UserRecord> = new Map();

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      console.log(' Initializing database pool with DATABASE_URL...');
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });

      this.pool
        .connect()
        .then((client) => {
          console.log('✅ Connected to PostgreSQL database successfully (Supabase/Postgres).');
          this.isConnected = true;
          client.release();
          this.initTables();
        })
        .catch((err: Error) => {
          console.error('❌ PostgreSQL connection failed on startup:', err.message);
          console.warn('⚠️ If running on Render, ensure you are using Supabase Connection Pooler URI (IPv4 compatible).');
          this.isConnected = false;
        });
    } else {
      console.log('ℹ️ No DATABASE_URL provided — match history and users will remain in-memory.');
    }
  }

  private async initTables() {
    if (!this.pool) return;
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          username VARCHAR(32) UNIQUE NOT NULL,
          email VARCHAR(128) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

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
      console.log(' Verified schema tables in PostgreSQL.');
    } catch (err: unknown) {
      console.warn('Failed to auto-init Postgres tables:', (err as Error).message);
    }
  }

  // --- USER AUTHENTICATION QUERIES ---

  public async createUser(username: string, email: string, passwordHash: string): Promise<UserRecord> {
    const id = uuidv4();
    const newUser: UserRecord = {
      id,
      username,
      email,
      password_hash: passwordHash,
      created_at: new Date(),
    };

    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO users (id, username, email, password_hash, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, username, email, passwordHash, newUser.created_at]
        );
        console.log(` Persisted new user '${username}' (${email}) to PostgreSQL database.`);
        this.isConnected = true;
        return newUser;
      } catch (err: unknown) {
        console.error(`❌ Failed to insert user into PostgreSQL:`, (err as Error).message);
        // If Postgres fails, fall back to memory
        this.memoryUsers.set(id, newUser);
        return newUser;
      }
    }

    // Memory fallback
    this.memoryUsers.set(id, newUser);
    return newUser;
  }

  public async findUserByEmailOrUsername(identifier: string): Promise<UserRecord | null> {
    const clean = identifier.trim().toLowerCase();

    if (this.pool) {
      try {
        const res = await this.pool.query<UserRecord>(
          `SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1 LIMIT 1`,
          [clean]
        );
        if (res.rows[0]) {
          return res.rows[0];
        }
      } catch (err: unknown) {
        console.error(`❌ Error querying user from PostgreSQL:`, (err as Error).message);
      }
    }

    // Memory fallback check
    for (const u of this.memoryUsers.values()) {
      if (u.email.toLowerCase() === clean || u.username.toLowerCase() === clean) {
        return u;
      }
    }
    return null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query<UserRecord>(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
        if (res.rows[0]) return res.rows[0];
      } catch (err: unknown) {
        console.error(`❌ Error querying user by ID:`, (err as Error).message);
      }
    }
    return this.memoryUsers.get(id) || null;
  }

  public async getUserStats(username: string) {
    if (this.pool) {
      try {
        const res = await this.pool.query(
          `SELECT 
            COUNT(*) as matches_played,
            COALESCE(MAX(final_score), 0) as high_score,
            COALESCE(SUM(final_score), 0) as total_score,
            COUNT(CASE WHEN rank = 1 THEN 1 END) as wins
           FROM match_players
           WHERE LOWER(player_name) = LOWER($1)`,
          [username]
        );
        return res.rows[0];
      } catch {
        return { matches_played: 0, high_score: 0, total_score: 0, wins: 0 };
      }
    }
    return { matches_played: 0, high_score: 0, total_score: 0, wins: 0 };
  }

  // --- MATCH HISTORY QUERIES ---

  public async saveMatch(room: Room, gameEndData: GameEndPayload): Promise<void> {
    if (!this.pool) return;

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

  public async getLeaderboard(limit = 10) {
    if (!this.pool) return [];
    try {
      const res = await this.pool.query(
        `SELECT player_name, MAX(final_score) as high_score, COUNT(*) as matches_played,
                COUNT(CASE WHEN rank = 1 THEN 1 END) as wins
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
