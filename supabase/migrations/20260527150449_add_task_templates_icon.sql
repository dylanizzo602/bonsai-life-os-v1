-- Migration: Add icon field to task_templates for template library UI
-- Stores a Material Symbols icon name (e.g. "calendar_today") per template.

ALTER TABLE task_templates
  ADD COLUMN IF NOT EXISTS icon TEXT;

