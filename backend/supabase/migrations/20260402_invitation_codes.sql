-- ============================================================================-- INVITATION CODE SYSTEM MIGRATION-- Description: Adds invitation code functionality for user registration-- Date: 2026-04-02
-- ============================================================================

-- ============================================================================-- SECTION 1: INVITATION CODES TABLE-- ============================================================================

CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());

-- ============================================================================-- SECTION 2: INVITATION CODE USAGE TRACKING-- ============================================================================

CREATE TABLE IF NOT EXISTS invitation_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_id UUID NOT NULL REFERENCES invitation_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(code_id, user_id));

-- ============================================================================-- SECTION 3: INDEXES FOR PERFORMANCE-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);CREATE INDEX IF NOT EXISTS idx_invitation_codes_expires ON invitation_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_created_by ON invitation_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_invitation_usage_code ON invitation_code_usage(code_id);
CREATE INDEX IF NOT EXISTS idx_invitation_usage_user ON invitation_code_usage(user_id);

-- ============================================================================-- SECTION 4: TRIGGER FOR UPDATED_AT-- ============================================================================

DROP TRIGGER IF EXISTS update_invitation_codes_updated_at ON invitation_codes;
CREATE TRIGGER update_invitation_codes_updated_at 
  BEFORE UPDATE ON invitation_codes
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================-- SECTION 5: ROW LEVEL SECURITY (RLS)-- ============================================================================

-- Enable RLS
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_code_usage ENABLE ROW LEVEL SECURITY;

-- Allow admins full access to invitation_codes
DROP POLICY IF EXISTS "Allow admins full access to invitation_codes" ON invitation_codes;
CREATE POLICY "Allow admins full access to invitation_codes" 
ON invitation_codes FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  )
);

-- Allow anyone to view non-expired codes (for validation)
DROP POLICY IF EXISTS "Allow public to view valid invitation codes" ON invitation_codes;
CREATE POLICY "Allow public to view valid invitation codes" 
ON invitation_codes FOR SELECT 
USING (expires_at > NOW());

-- Allow admins to view usage
DROP POLICY IF EXISTS "Allow admins to view invitation usage" ON invitation_code_usage;
CREATE POLICY "Allow admins to view invitation usage" 
ON invitation_code_usage FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated users to insert their own usage record
DROP POLICY IF EXISTS "Allow users to insert their invitation usage" ON invitation_code_usage;
CREATE POLICY "Allow users to insert their invitation usage" 
ON invitation_code_usage FOR INSERT 
WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- ============================================================================-- SECTION 6: HELPER FUNCTIONS-- ============================================================================

-- Function to check if invitation code is valid
CREATE OR REPLACE FUNCTION is_invitation_code_valid(p_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM invitation_codes 
    WHERE code = p_code 
    AND expires_at > NOW()
  ) INTO v_valid;
  
  RETURN v_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get invitation code usage count
CREATE OR REPLACE FUNCTION get_invitation_code_usage_count(p_code_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) 
  INTO v_count
  FROM invitation_code_usage 
  WHERE code_id = p_code_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================-- MIGRATION COMPLETE-- ============================================================================