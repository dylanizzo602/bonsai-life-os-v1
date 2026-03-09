-- Goals: make start_date and target_date optional (nullable)
-- Allows creating/editing goals without requiring start and target dates

ALTER TABLE goals
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN target_date DROP NOT NULL;
