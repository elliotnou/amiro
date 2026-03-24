ALTER TABLE impressions ADD COLUMN IF NOT EXISTS hidden_from_ai boolean DEFAULT false NOT NULL;
