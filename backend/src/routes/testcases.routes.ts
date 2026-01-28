import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { suiteId, status, priority } = req.query;
    
    let query = supabase
      .from('test_cases')
      .select(`
        *,
        test_suites (
          id,
          name,
          description
        )
      `)
      .eq('created_by', req.dbUserId!)
      .order('created_at', { ascending: false });

    if (suiteId) {
      query = query.eq('suite_id', suiteId as string);
    }
    if (status) {
      query = query.eq('status', status as string);
    }
    if (priority) {
      query = query.eq('priority', priority as string);
    }

    const { data: testCases, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch test cases' });
    }

    const formattedTestCases = testCases?.map(tc => ({
      ...tc,
      suite: tc.test_suites,
      suiteId: tc.suite_id,
      createdBy: tc.created_by,
      createdAt: tc.created_at,
      updatedAt: tc.updated_at,
      steps: typeof tc.steps === 'string' ? JSON.parse(tc.steps) : tc.steps,
      tags: typeof tc.tags === 'string' ? JSON.parse(tc.tags) : tc.tags
    })) || [];

    res.json(formattedTestCases);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { data: testCase, error } = await supabase
      .from('test_cases')
      .select(`
        *,
        test_suites (
          id,
          name,
          description
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const { data: versions } = await supabase
      .from('test_case_versions')
      .select('*')
      .eq('test_case_id', testCase.id)
      .order('created_at', { ascending: false });

    const formattedTestCase = {
      ...testCase,
      suite: testCase.test_suites,
      suiteId: testCase.suite_id,
      createdBy: testCase.created_by,
      createdAt: testCase.created_at,
      updatedAt: testCase.updated_at,
      steps: typeof testCase.steps === 'string' ? JSON.parse(testCase.steps) : testCase.steps,
      tags: typeof testCase.tags === 'string' ? JSON.parse(testCase.tags) : testCase.tags,
      versions: versions?.map(v => ({
        ...v,
        testCaseId: v.test_case_id,
        createdBy: v.created_by,
        createdAt: v.created_at
      })) || []
    };

    res.json(formattedTestCase);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { suiteId, title, description, steps, expectedResult, status, priority, tags } = req.body;
    
    const { data: testCase, error: insertError } = await supabase
      .from('test_cases')
      .insert({
        suite_id: suiteId,
        title,
        description,
        steps: steps || [],
        expected_result: expectedResult,
        status: status || 'DRAFT',
        priority: priority || 'MEDIUM',
        tags: tags || [],
        created_by: req.dbUserId!
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create test case' });
    }

    await supabase.from('test_case_versions').insert({
      test_case_id: testCase.id,
      version: 1,
      changes: 'Initial version',
      created_by: req.dbUserId!
    });

    const formattedTestCase = {
      ...testCase,
      suiteId: testCase.suite_id,
      createdBy: testCase.created_by,
      createdAt: testCase.created_at,
      updatedAt: testCase.updated_at,
      steps: typeof testCase.steps === 'string' ? JSON.parse(testCase.steps) : testCase.steps,
      tags: typeof testCase.tags === 'string' ? JSON.parse(testCase.tags) : testCase.tags
    };

    res.status(201).json(formattedTestCase);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { suiteId, title, description, steps, expectedResult, status, priority, tags } = req.body;
    
    const { data: existingTestCase, error: fetchError } = await supabase
      .from('test_cases')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existingTestCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    
    const { data: updated, error: updateError } = await supabase
      .from('test_cases')
      .update({
        suite_id: suiteId,
        title,
        description,
        steps: steps || [],
        expected_result: expectedResult,
        status,
        priority,
        tags,
        version: existingTestCase.version + 1
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update test case' });
    }
    
    await supabase.from('test_case_versions').insert({
      test_case_id: existingTestCase.id,
      version: existingTestCase.version + 1,
      changes: 'Updated test case',
      created_by: req.dbUserId!
    });

    const formattedTestCase = {
      ...updated,
      suiteId: updated.suite_id,
      createdBy: updated.created_by,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      steps: typeof updated.steps === 'string' ? JSON.parse(updated.steps) : updated.steps,
      tags: typeof updated.tags === 'string' ? JSON.parse(updated.tags) : updated.tags
    };

    res.json(formattedTestCase);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('test_cases')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete test case' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;