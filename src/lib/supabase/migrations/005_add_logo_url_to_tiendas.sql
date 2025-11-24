-- 005_add_logo_url_to_tiendas.sql
-- Add logo_url column to tiendas table if it doesn't exist

DO $$
BEGIN
    ALTER TABLE tiendas ADD COLUMN IF NOT EXISTS logo_url TEXT;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column logo_url already exists in tiendas.';
END $$;
