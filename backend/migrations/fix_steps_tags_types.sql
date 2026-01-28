-- Migration to change steps and tags columns from TEXT to JSONB
-- This allows for efficient querying and indexing of JSON data

-- Change steps column to JSONB
ALTER TABLE test_cases ALTER COLUMN steps TYPE JSONB USING steps::jsonb;

-- Change tags column to JSONB  
ALTER TABLE test_cases ALTER COLUMN tags TYPE JSONB USING COALESCE(tags::jsonb, '[]'::jsonb);
