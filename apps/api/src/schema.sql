CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  handle TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  short_code TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  pause_until TIMESTAMPTZ,
  age_verified_at TIMESTAMPTZ,
  name_set BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS pause_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_set BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_codes_email_idx ON auth_codes(email);

CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  passkey_public_key TEXT,
  counter BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a <> user_b)
);

ALTER TABLE connections ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS connections_user_a_idx ON connections(user_a);
CREATE INDEX IF NOT EXISTS connections_user_b_idx ON connections(user_b);

CREATE TABLE IF NOT EXISTS windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  span TSTZRANGE NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS windows_span_idx ON windows USING GIST (span);
CREATE INDEX IF NOT EXISTS windows_user_idx ON windows(user_id);

CREATE TABLE IF NOT EXISTS "overlaps" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  span TSTZRANGE NOT NULL,
  night_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS overlap_members (
  overlap_id UUID NOT NULL REFERENCES "overlaps"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response TEXT,
  PRIMARY KEY (overlap_id, user_id)
);

CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overlap_id UUID NOT NULL UNIQUE REFERENCES "overlaps"(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE threads ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT 'Saratoga Springs';
ALTER TABLE threads ADD COLUMN IF NOT EXISTS pinned_place TEXT;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES users(id);
ALTER TABLE threads ADD COLUMN IF NOT EXISTS meet_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS thread_places (
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  votes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (thread_id, name)
);

ALTER TABLE thread_places ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

CREATE TABLE IF NOT EXISTS thread_votes (
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_name TEXT NOT NULL,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  audio_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration_ms INT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio BYTEA;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_type TEXT;

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  uses_remaining INT NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  ticket_id TEXT,
  received_at TIMESTAMPTZ,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_kind_idx ON notifications(user_id, kind, created_at);
CREATE INDEX IF NOT EXISTS notifications_due_idx ON notifications(created_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS overlap_members_user_idx ON overlap_members(user_id);
CREATE INDEX IF NOT EXISTS messages_thread_created_idx ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS invite_tokens_user_idx ON invite_tokens(user_id);

CREATE TABLE IF NOT EXISTS hangout_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overlap_id UUID NOT NULL REFERENCES "overlaps"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  night_date DATE NOT NULL,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (overlap_id, user_id)
);
