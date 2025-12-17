-- Bolão Mega da Virada 2026 - Database Schema
-- Execute this SQL in your Supabase SQL Editor

-- Drop existing tables if they exist (for development only)
DROP TABLE IF EXISTS final_bets CASCADE;
DROP TABLE IF EXISTS number_scores CASCADE;
DROP TABLE IF EXISTS number_selections CASCADE;
DROP TABLE IF EXISTS participations CASCADE;
DROP TABLE IF EXISTS historical_draws CASCADE;
DROP TABLE IF EXISTS bolao CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE - Authentication (name-based, no passwords)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast name lookups
CREATE INDEX idx_users_name ON users(name);

-- Insert initial admin user
INSERT INTO users (name, is_admin) VALUES ('Carlos', TRUE);

-- 2. BOLAO TABLE - Bolão instance management
CREATE TABLE bolao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quota_value DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'open',
  closure_hash TEXT,
  closure_data JSONB,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT status_check CHECK (status IN ('open', 'closed'))
);

-- Only one active (open) bolão at a time
CREATE UNIQUE INDEX idx_bolao_active ON bolao(status) WHERE status = 'open';

-- Insert initial bolão
INSERT INTO bolao (name, quota_value)
VALUES ('Bolão Mega da Virada 2026', 10.00);

-- 3. PARTICIPATIONS TABLE - User membership in bolão
CREATE TABLE participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bolao_id UUID REFERENCES bolao(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_claimed_at TIMESTAMP WITH TIME ZONE,
  payment_confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bolao_id, user_id),
  CONSTRAINT payment_status_check CHECK (payment_status IN ('pending', 'claimed', 'confirmed'))
);

-- Indexes for fast queries
CREATE INDEX idx_participations_bolao ON participations(bolao_id);
CREATE INDEX idx_participations_user ON participations(user_id);
CREATE INDEX idx_participations_status ON participations(payment_status);

-- 4. NUMBER_SELECTIONS TABLE - User number picks
CREATE TABLE number_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id UUID REFERENCES participations(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number >= 1 AND number <= 60),
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participation_id, number)
);

-- Indexes for efficient queries
CREATE INDEX idx_number_selections_participation ON number_selections(participation_id);
CREATE INDEX idx_number_selections_number ON number_selections(number);

-- 5. HISTORICAL_DRAWS TABLE - Mega-Sena historical data (2,951 draws)
CREATE TABLE historical_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_number INTEGER NOT NULL UNIQUE,
  draw_date DATE NOT NULL,
  number_1 INTEGER NOT NULL CHECK (number_1 >= 1 AND number_1 <= 60),
  number_2 INTEGER NOT NULL CHECK (number_2 >= 1 AND number_2 <= 60),
  number_3 INTEGER NOT NULL CHECK (number_3 >= 1 AND number_3 <= 60),
  number_4 INTEGER NOT NULL CHECK (number_4 >= 1 AND number_4 <= 60),
  number_5 INTEGER NOT NULL CHECK (number_5 >= 1 AND number_5 <= 60),
  number_6 INTEGER NOT NULL CHECK (number_6 >= 1 AND number_6 <= 60),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for historical queries
CREATE INDEX idx_historical_draws_date ON historical_draws(draw_date DESC);
CREATE INDEX idx_historical_draws_contest ON historical_draws(contest_number);

-- 6. NUMBER_SCORES TABLE - Dynamic scoring system (0-100)
CREATE TABLE number_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bolao_id UUID REFERENCES bolao(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number >= 1 AND number <= 60),
  historical_frequency INTEGER NOT NULL DEFAULT 0,
  current_popularity INTEGER NOT NULL DEFAULT 0,
  anti_pattern_penalty INTEGER NOT NULL DEFAULT 0,
  final_score INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bolao_id, number)
);

-- Indexes for score queries
CREATE INDEX idx_number_scores_bolao ON number_scores(bolao_id);
CREATE INDEX idx_number_scores_final ON number_scores(bolao_id, final_score);

-- 7. FINAL_BETS TABLE - Closed bolão results
CREATE TABLE final_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bolao_id UUID REFERENCES bolao(id) ON DELETE CASCADE,
  bet_type TEXT NOT NULL,
  numbers INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for bolão lookup
CREATE INDEX idx_final_bets_bolao ON final_bets(bolao_id);

-- Enable Row Level Security (basic setup for localhost)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE number_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all operations for now (localhost development)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for participations" ON participations FOR ALL USING (true);
CREATE POLICY "Allow all for number_selections" ON number_selections FOR ALL USING (true);

-- Grant access to authenticated users (anon role)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verification query
SELECT 'Schema created successfully!' AS status;
SELECT COUNT(*) AS user_count FROM users WHERE is_admin = true;
SELECT COUNT(*) AS bolao_count FROM bolao WHERE status = 'open';
