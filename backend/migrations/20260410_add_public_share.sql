-- Allow test run owners to make a run publicly viewable via a share link
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
