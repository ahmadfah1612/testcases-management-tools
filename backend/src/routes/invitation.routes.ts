import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// ─── Public (no auth) ─────────────────────────────────────────────────────────

// Validate invitation code (Public — for registration)
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

// ─── Admin-only (auth required) ───────────────────────────────────────────────

router.use(authMiddleware);
router.use(adminMiddleware);

// List all invitation codes with usage count
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: codes, error } = await supabase
      .from('invitation_codes')
      .select(`*, creator:created_by(username), usage:invitation_code_usage(count)`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ data: codes?.map(c => ({ ...c, usage_count: c.usage?.[0]?.count || 0 })) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list invitation codes' });
  }
});

// Create new invitation code
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { code, expires_at } = req.body;
    if (!code || !expires_at) return res.status(400).json({ error: 'Code and expiration date are required' });

    const { data, error } = await supabase
      .from('invitation_codes')
      .insert({ code: code.toUpperCase(), expires_at, created_by: req.dbUserId! })
      .select()
      .single();
    if (error) {
      if (error.message.includes('duplicate key')) return res.status(400).json({ error: 'Invitation code already exists' });
      throw error;
    }
    res.status(201).json({ message: 'Invitation code created successfully', data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create invitation code' });
  }
});

// Delete invitation code
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase.from('invitation_codes').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Invitation code deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete invitation code' });
  }
});

// Extend invitation code expiration
router.patch('/:id/extend', async (req: AuthRequest, res) => {
  try {
    const { expires_at } = req.body;
    if (!expires_at) return res.status(400).json({ error: 'New expiration date is required' });

    const { data, error } = await supabase
      .from('invitation_codes').update({ expires_at }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ message: 'Invitation code expiration extended successfully', data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to extend invitation code' });
  }
});

// Get usage details for a specific code
router.get('/:id/usage', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('invitation_code_usage')
      .select(`*, user:user_id(username, email)`)
      .eq('code_id', req.params.id)
      .order('used_at', { ascending: false });
    if (error) throw error;
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get usage details' });
  }
});

export default router;