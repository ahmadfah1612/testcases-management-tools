import { Router } from 'express';
import bcrypt from 'bcrypt';
import { supabase } from '../utils/supabase';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${username},email.eq.${email}`);

    if (checkError) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role
      })
      .select('id, username, email, role, created_at')
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
