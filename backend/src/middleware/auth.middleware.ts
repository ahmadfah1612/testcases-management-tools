import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userId?: string; // This is auth.user.id (Supabase Auth ID)
  dbUserId?: string; // This is users.id (custom users table)
  userRole?: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log('No authorization header provided');
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    
    console.log('=== Auth Middleware ===');
    console.log('Token:', token.substring(0, 20) + '...');
    
    // Verify token with Supabase
    const { supabase } = await import('../utils/supabase');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log('Invalid token:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.userId = user.id;
    console.log('Supabase Auth User ID:', user.id, 'Email:', user.email);
    
    // Get user data from our users table
    // First try by auth_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, id, email, auth_id')
      .eq('auth_id', user.id)
      .single();
    
    if (userData) {
      req.userRole = userData.role;
      req.dbUserId = userData.id;
      console.log('✓ User found by auth_id - DB User ID:', userData.id, 'Role:', userData.role);
    } else {
      console.log('✗ User not found by auth_id, trying by email...');
      
      // Fallback: Try to find user by email from auth user metadata
      const userEmail = (user as any).user_metadata?.email || (user as any).email;
      
      if (userEmail) {
        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('role, id, email, auth_id')
          .eq('email', userEmail)
          .single();
        
        if (userByEmail) {
          req.userRole = userByEmail.role;
          req.dbUserId = userByEmail.id;
          console.log('✓ User found by email - DB User ID:', userByEmail.id, 'Role:', userByEmail.role);
          
          // Update auth_id if it was missing
          if (!userByEmail.auth_id) {
            console.log('Updating auth_id for user:', userByEmail.id);
            await supabase
              .from('users')
              .update({ auth_id: user.id })
              .eq('id', userByEmail.id);
          }
        } else {
          console.log('✗ User not found by email:', userEmail, 'Error:', emailError);
        }
      }
    }
    
    // Final check if we have dbUserId
    if (!req.dbUserId) {
      console.error('✗ Failed to find user record');
      return res.status(401).json({ error: 'User record not found in database' });
    }
    
    console.log('=== Auth Middleware Complete ===');
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
