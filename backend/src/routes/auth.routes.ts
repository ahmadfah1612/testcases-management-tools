import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../utils/supabase';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Register - Creates Supabase Auth user and custom user record
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if username already exists in our users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .ilike('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: authError.message });
    }

    // Wait for trigger to create custom user record
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update custom user record with actual username
    if (authData.user) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ username })
        .eq('auth_id', authData.user.id);

      if (updateError) {
        console.error('Error updating username:', updateError);
      }
    }

    // Get complete user data
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authData.user?.id)
      .single();

    if (fetchError) {
      console.error('Error fetching user data:', fetchError);
    }

    // Generate JWT token for our app
    const token = jwt.sign({ userId: userData?.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      user: {
        id: userData?.id,
        username: userData?.username,
        email: userData?.email,
        role: userData?.role,
        createdAt: userData?.created_at
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login - Uses Supabase Auth
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt for username:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username);

    console.log('User lookup result:', { 
      count: users?.length,
      users: users?.map(u => ({ username: u.username, email: u.email })),
      error: usersError?.message 
    });

    const user = users && users.length > 0 ? users[0] : null;

    if (!user || usersError) {
      console.error('User not found in custom users table:', usersError);
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('Found user:', user.username, 'with email:', user.email);

    // Authenticate with Supabase using email
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password
    });

    if (authError) {
      console.error('Supabase auth error details:', {
        message: authError.message,
        status: authError.status,
        name: authError.name,
        email: user.email
      });
      return res.status(401).json({ 
        error: 'Invalid credentials', 
        details: authError.message 
      });
    }

    console.log('Supabase auth successful for:', user.username);

    // Generate JWT token for our app
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint (optional)
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Get user data
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
