-- SketchAI PostgreSQL Schema (Durable storage for users, matches, and leaderboards)

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

CREATE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_match_players_score ON match_players(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_started_at ON matches(started_at DESC);
