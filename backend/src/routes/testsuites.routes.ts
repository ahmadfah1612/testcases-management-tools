import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Test route without auth - should work
router.get('/ping', (req, res) => {
  console.log('🏓 PING route hit!');
  res.json({ message: 'Ping received', timestamp: new Date().toISOString() });
});

// Test route with auth
router.get('/auth-test', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔐 AUTH-TEST route hit!');
  console.log('User:', req.userId, 'DB User:', req.dbUserId);
  res.json({ message: 'Auth test passed', userId: req.userId, dbUserId: req.dbUserId });
});

// Apply auth middleware to all other routes
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: testSuites, error } = await supabase
      .from('test_suites')
      .select(`
        *,
        children:test_suites (
          id,
          name,
          description,
          parent_id,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('created_by', req.dbUserId!)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch test suites' });
    }

    const formattedSuites = await Promise.all(
      (testSuites || []).map(async (suite: any) => {
        const { count } = await supabase
          .from('test_cases')
          .select('*', { count: 'exact', head: true })
          .eq('suite_id', suite.id);

        return {
          ...suite,
          parentId: suite.parent_id,
          createdBy: suite.created_by,
          createdAt: suite.created_at,
          updatedAt: suite.updated_at,
          children: suite.children?.map((child: any) => ({
            ...child,
            parentId: child.parent_id,
            createdBy: child.created_by,
            createdAt: child.created_at,
            updatedAt: child.updated_at
          })) || [],
          _count: { testCases: count || 0 }
        };
      })
    );

    res.json(formattedSuites);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { data: testSuite, error } = await supabase
      .from('test_suites')
      .select(`
        *,
        children:test_suites (
          id,
          name,
          description,
          parent_id,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !testSuite) {
      return res.status(404).json({ error: 'Test suite not found' });
    }

    const { count } = await supabase
      .from('test_cases')
      .select('*', { count: 'exact', head: true })
      .eq('suite_id', testSuite.id);

    const formattedSuite = {
      ...testSuite,
      parentId: testSuite.parent_id,
      createdBy: testSuite.created_by,
      createdAt: testSuite.created_at,
      updatedAt: testSuite.updated_at,
      children: await Promise.all((testSuite.children || []).map(async (child: any) => {
        const { count: childCount } = await supabase
          .from('test_cases')
          .select('*', { count: 'exact', head: true })
          .eq('suite_id', child.id);
        return {
          ...child,
          parentId: child.parent_id,
          createdBy: child.created_by,
          createdAt: child.created_at,
          updatedAt: child.updated_at,
          _count: { testCases: childCount || 0 }
        };
      })) || [],
      _count: { testCases: count || 0 }
    };

    res.json(formattedSuite);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    console.log('=== POST /testsuites ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', req.body);
    console.log('Request dbUserId:', req.dbUserId);
    console.log('Request userId:', req.userId);
    
    const { name, description, parentId } = req.body;
    
    console.log('Inserting test suite:', {
      name,
      description,
      parentId,
      created_by: req.dbUserId
    });
    
    const { data: testSuite, error } = await supabase
      .from('test_suites')
      .insert({
        name,
        description,
        parent_id: parentId || null,
        created_by: req.dbUserId!
      })
      .select()
      .single();

    console.log('Insert result:', JSON.stringify({ testSuite, error }, null, 2));

    if (error) {
      console.error('✗ Supabase insert error:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: 'Failed to create test suite', details: error.message });
    }

    const formattedSuite = {
      ...testSuite,
      parentId: testSuite.parent_id,
      createdBy: testSuite.created_by,
      createdAt: testSuite.created_at,
      updatedAt: testSuite.updated_at
    };

    res.status(201).json(formattedSuite);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, description, parentId } = req.body;
    const { data: testSuite, error } = await supabase
      .from('test_suites')
      .update({
        name,
        description,
        parent_id: parentId
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update test suite' });
    }

    const formattedSuite = {
      ...testSuite,
      parentId: testSuite.parent_id,
      createdBy: testSuite.created_by,
      createdAt: testSuite.created_at,
      updatedAt: testSuite.updated_at
    };

    res.json(formattedSuite);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('test_suites')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete test suite' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;