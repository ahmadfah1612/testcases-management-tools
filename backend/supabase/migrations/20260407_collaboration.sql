-- Collaboration tables for team sharing of test resources
-- Roles: 'editor' (read+write), 'viewer' (read-only)
-- Owner is implicit (the created_by / started_by user) and is not stored here.

CREATE TABLE IF NOT EXISTS suite_collaborators (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suite_id    UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('editor', 'viewer')),
  invited_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(suite_id, user_id)
);

CREATE TABLE IF NOT EXISTS testcase_collaborators (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  testcase_id  UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         VARCHAR(20) NOT NULL DEFAULT 'viewer'
                 CHECK (role IN ('editor', 'viewer')),
  invited_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(testcase_id, user_id)
);

CREATE TABLE IF NOT EXISTS testrun_collaborators (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  testrun_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('editor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(testrun_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_suite_collaborators_suite_id ON suite_collaborators(suite_id);
CREATE INDEX IF NOT EXISTS idx_suite_collaborators_user_id  ON suite_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_testcase_collaborators_testcase_id ON testcase_collaborators(testcase_id);
CREATE INDEX IF NOT EXISTS idx_testcase_collaborators_user_id     ON testcase_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_testrun_collaborators_testrun_id ON testrun_collaborators(testrun_id);
CREATE INDEX IF NOT EXISTS idx_testrun_collaborators_user_id    ON testrun_collaborators(user_id);
