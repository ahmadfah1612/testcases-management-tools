import { Router } from 'express';
import { supabase } from '../utils/supabase';

const router = Router();

router.get('/debug/all', async (req, res) => {
  try {
    // Test 1: Get all users (to verify connection)
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('*');

    // Test 2: Search for admin with exact match
    const { data: adminExact, error: exactError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin');

    // Test 3: Case insensitive search
    const { data: adminLike, error: likeError } = await supabase
      .from('users')
      .select('*')
      .ilike('username', '%admin%');

    // Test 4: Search by email
    const { data: emailUser, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'afahrurozi@gmail.com');

    res.json({
      connection: 'OK',
      tests: {
        allUsersCount: allUsers?.length || 0,
        allUsers: allUsers?.map(u => ({ id: u.id, username: u.username, email: u.email })),
        adminExactCount: adminExact?.length || 0,
        adminExactUsers: adminExact?.map(u => ({ id: u.id, username: u.username, email: u.email })),
        adminLikeCount: adminLike?.length || 0,
        adminLikeUsers: adminLike?.map(u => ({ id: u.id, username: u.username, email: u.email })),
        emailUserCount: emailUser?.length || 0,
        emailUser: emailUser?.map(u => ({ id: u.id, username: u.username, email: u.email })),
      },
      errors: {
        allError: allError?.message,
        exactError: exactError?.message,
        likeError: likeError?.message,
        emailError: emailError?.message
      },
      supabaseConfig: {
        url: process.env.SUPABASE_URL || 'NOT SET',
        hasKey: !!process.env.SUPABASE_ANON_KEY
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug failed', details: error });
  }
});

router.post('/debug/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('[DEBUG] Login attempt for:', username);

    // Find user by username
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username);

    console.log('[DEBUG] User lookup result:', JSON.stringify({
      count: users?.length,
      users: users?.map(u => ({ id: u.id, username: u.username, email: u.email })),
      error: usersError?.message
    }, null, 2));

    const user = users && users.length > 0 ? users[0] : null;

    if (!user || usersError) {
      console.error('[DEBUG] User not found:', usersError);
      return res.status(401).json({ 
        error: 'User not found',
        debug: {
          count: users?.length,
          error: usersError?.message
        }
      });
    }

    console.log('[DEBUG] Found user:', user.username, 'with email:', user.email);

    // Authenticate with Supabase using email
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password
    });

    if (authError) {
      console.error('[DEBUG] Supabase auth error:', JSON.stringify({
        message: authError.message,
        status: authError.status,
        name: authError.name
      }, null, 2));
      return res.status(401).json({ 
        error: 'Invalid credentials', 
        details: authError.message,
        debug: {
          userEmail: user.email,
          username: user.username
        }
      });
    }

    console.log('[DEBUG] Supabase auth successful for:', user.username);

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('[DEBUG] Login error:', error);
    res.status(500).json({ error: 'Internal server error', details: error });
  }
});

export default router;
