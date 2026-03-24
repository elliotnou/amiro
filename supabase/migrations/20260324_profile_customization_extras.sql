ALTER TABLE profile_customizations
  ADD COLUMN IF NOT EXISTS pattern  text    DEFAULT 'none' NOT NULL,
  ADD COLUMN IF NOT EXISTS vibe_word text;
