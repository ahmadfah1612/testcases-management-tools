import { Router } from 'express';
import { supabase } from '../utils/supabase';

const router = Router();

// Helper function to check if user is admin
const isAdmin = async (authId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', authId)
    .single();
  
  if (error || !data) return false;
  return data.role === 'admin';
};

// Create new invitation code (Admin only)
router.post('/', async (req, res) => {
  try {
    const { code, expires_at } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    // Get current user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const adminCheck = await isAdmin(user.id);
    if (!adminCheck) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate input
    if (!code || !expires_at) {
      return res.status(400).json({ error: 'Code and expiration date are required' });
    }

    // Get admin's user ID from custom users table
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (adminError || !adminUser) {
      return res.status(500).json({ error: 'Failed to get admin user' });
    }

    // Create invitation code
    const { data, error } = await supabase
      .from('invitation_codes')
      .insert({
        code: code.toUpperCase(),
        expires_at,
        created_by: adminUser.id
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate key')) {
        return res.status(400).json({ error: 'Invitation code already exists' });
      }
      throw error;
    }

    res.status(201).json({
      message: 'Invitation code created successfully',
      data
    });
  } catch (error: any) {
    console.error('Create invitation code error:', error);
    res.status(500).json({ error: error.message || 'Failed to create invitation code' });
  }
});

// List all invitation codes with usage count (Admin only)
router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const adminCheck = await isAdmin(user.id);
    if (!adminCheck) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all invitation codes with usage count
    const { data: codes, error } = await supabase
      .from('invitation_codes')
      .select(`
        *,
        creator:created_by(username),
        usage:invitation_code_usage(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Format the response
    const formattedCodes = codes?.map(code => ({
      ...code,
      usage_count: code.usage?.[0]?.count || 0
    }));

    res.json({ data: formattedCodes });
  } catch (error: any) {
    console.error('List invitation codes error:', error);
    res.status(500).json({ error: error.message || 'Failed to list invitation codes' });
  }
});

// Delete invitation code (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const adminCheck = await isAdmin(user.id);
    if (!adminCheck) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { error } = await supabase
      .from('invitation_codes')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Invitation code deleted successfully' });
  } catch (error: any) {
    console.error('Delete invitation code error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete invitation code' });
  }
});

// Extend invitation code expiration (Admin only)
router.patch('/:id/extend', async (req, res) => {
  try {
    const { id } = req.params;
    const { expires_at } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const adminCheck = await isAdmin(user.id);
    if (!adminCheck) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!expires_at) {
      return res.status(400).json({ error: 'New expiration date is required' });
    }

    const { data, error } = await supabase
      .from('invitation_codes')
      .update({ expires_at })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      message: 'Invitation code expiration extended successfully',
      data
    });
  } catch (error: any) {
    console.error('Extend invitation code error:', error);
    res.status(500).json({ error: error.message || 'Failed to extend invitation code' });
  }
});

// Get usage details for a specific code (Admin only)
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const adminCheck = await isAdmin(user.id);
    if (!adminCheck) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data, error } = await supabase
      .from('invitation_code_usage')
      .select(`
        *,
        user:user_id(username, email)
      `)
      .eq('code_id', id)
      .order('used_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ data });
  } catch (error: any) {
    console.error('Get invitation code usage error:', error);
    res.status(500).json({ error: error.message || 'Failed to get usage details' });
  }
});

// Validate invitation code (Public - for registration)
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Invitation code is required' });
    }

    const { data, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return res.status(400).json({ 
        valid: false,
        error: 'Invalid or expired invitation code' 
      });
    }

    res.json({ 
      valid: true,
      data 
    });
  } catch (error: any) {
    console.error('Validate invitation code error:', error);
    res.status(500).json({ error: error.message || 'Failed to validate invitation code' });
  }
});

export default router;