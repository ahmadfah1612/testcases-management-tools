import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: testRuns, error } = await supabase
      .from('test_runs')
      .select(`
        *,
        test_plans (
          id,
          name,
          description
        )
      `)
      .eq('started_by', req.userId!)
      .order('started_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch test runs' });
    }

    const formattedRuns = await Promise.all(
      (testRuns || []).map(async (run: any) => {
        const { count } = await supabase
          .from('test_results')
          .select('*', { count: 'exact', head: true })
          .eq('test_run_id', run.id);

        return {
          ...run,
          testPlan: run.test_plans,
          testPlanId: run.test_plan_id,
          startedBy: run.started_by,
          startedAt: run.started_at,
          completedAt: run.completed_at,
          _count: { results: count || 0 }
        };
      })
    );

    res.json(formattedRuns);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { data: testRun, error } = await supabase
      .from('test_runs')
      .select(`
        *,
        test_plans (
          id,
          name,
          description
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !testRun) {
      return res.status(404).json({ error: 'Test run not found' });
    }

    const { data: results } = await supabase
      .from('test_results')
      .select(`
        *,
        test_cases (
          id,
          title,
          description,
          status,
          priority
        )
      `)
      .eq('test_run_id', req.params.id)
      .order('created_at', { ascending: false });

    const formattedRun = {
      ...testRun,
      testPlan: testRun.test_plans,
      testPlanId: testRun.test_plan_id,
      startedBy: testRun.started_by,
      startedAt: testRun.started_at,
      completedAt: testRun.completed_at,
      results: results?.map((r: any) => ({
        ...r,
        testCase: r.test_cases,
        testRunId: r.test_run_id,
        testCaseId: r.test_case_id,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      })) || []
    };

    res.json(formattedRun);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { testPlanId, name } = req.body;
    
    const { data: testPlan, error: planError } = await supabase
      .from('test_plans')
      .select('*')
      .eq('id', testPlanId)
      .single();

    if (planError || !testPlan) {
      return res.status(404).json({ error: 'Test plan not found' });
    }
    
    const { data: testRun, error: insertError } = await supabase
      .from('test_runs')
      .insert({
        test_plan_id: testPlanId,
        name,
        started_by: req.userId!
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create test run' });
    }
    
    const testCaseIds = testPlan.test_case_ids;
    if (testCaseIds && testCaseIds.length > 0) {
      const results = testCaseIds.map((testCaseId: string) => ({
        test_run_id: testRun.id,
        test_case_id: testCaseId,
        status: 'SKIP',
        created_by: req.userId!
      }));

      await supabase.from('test_results').insert(results);
    }
    
    const formattedRun = {
      ...testRun,
      testPlanId: testRun.test_plan_id,
      startedBy: testRun.started_by,
      startedAt: testRun.started_at,
      completedAt: testRun.completed_at
    };

    res.status(201).json(formattedRun);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    
    const { data: testRun, error } = await supabase
      .from('test_runs')
      .update({
        status,
        ...(status === 'COMPLETED' && { completed_at: new Date().toISOString() })
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update test run' });
    }

    const formattedRun = {
      ...testRun,
      testPlanId: testRun.test_plan_id,
      startedBy: testRun.started_by,
      startedAt: testRun.started_at,
      completedAt: testRun.completed_at
    };

    res.json(formattedRun);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('test_runs')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete test run' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/results', async (req: AuthRequest, res) => {
  try {
    const { testCaseId, status, actualResult, screenshots, notes } = req.body;
    
    const { error } = await supabase
      .from('test_results')
      .update({
        status,
        actual_result: actualResult,
        screenshots: screenshots || [],
        notes
      })
      .eq('test_run_id', req.params.id)
      .eq('test_case_id', testCaseId);
    
    if (error) {
      return res.status(500).json({ error: 'Failed to update test result' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;