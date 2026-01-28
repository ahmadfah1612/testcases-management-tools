import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { data: testPlans, error, count } = await supabase
      .from('test_plans')
      .select('*', { count: 'exact' })
      .eq('created_by', req.dbUserId!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch test plans' });
    }

    const formattedPlans = await Promise.all(
      (testPlans || []).map(async (plan: any) => {
        const [runsCount, assignmentsCount] = await Promise.all([
          supabase
            .from('test_runs')
            .select('*', { count: 'exact', head: true })
            .eq('test_plan_id', plan.id),
          supabase
            .from('test_plan_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('plan_id', plan.id)
        ]);

        return {
          ...plan,
          testCaseIds: plan.test_case_ids || [],
          createdBy: plan.created_by,
          createdAt: plan.created_at,
          updatedAt: plan.updated_at,
          _count: { 
            runs: runsCount.count || 0,
            testCases: assignmentsCount.count || 0
          }
        };
      })
    );

    res.json({
      data: formattedPlans,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { data: testPlan, error } = await supabase
      .from('test_plans')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !testPlan) {
      return res.status(404).json({ error: 'Test plan not found' });
    }

    const { data: assignments } = await supabase
      .from('test_plan_assignments')
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
      .eq('plan_id', req.params.id);

    const { data: runs } = await supabase
      .from('test_runs')
      .select('*')
      .eq('test_plan_id', req.params.id)
      .order('started_at', { ascending: false })
      .limit(10);

    const formattedPlan = {
      ...testPlan,
      testCaseIds: testPlan.test_case_ids,
      createdBy: testPlan.created_by,
      createdAt: testPlan.created_at,
      updatedAt: testPlan.updated_at,
      assignments: assignments?.map((a: any) => ({
        ...a,
        testCase: a.test_cases,
        testCaseId: a.test_case_id,
        planId: a.plan_id
      })) || [],
      runs: runs?.map((r: any) => ({
        ...r,
        testPlanId: r.test_plan_id,
        startedBy: r.started_by,
        startedAt: r.started_at,
        completedAt: r.completed_at
      })) || []
    };

    res.json(formattedPlan);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

  router.post('/', async (req: AuthRequest, res) => {
    try {
      const { name, description, testCaseIds } = req.body;
      
      const { data: testPlan, error: insertError } = await supabase
        .from('test_plans')
        .insert({
          name,
          description,
          test_case_ids: testCaseIds || [],
          created_by: req.dbUserId
        })
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: 'Failed to create test plan' });
      }
      
      const formattedPlan = {
        ...testPlan,
        testCaseIds: testPlan.test_case_ids,
        createdBy: testPlan.created_by,
        createdAt: testPlan.created_at,
        updatedAt: testPlan.updated_at
      };

      res.status(201).json(formattedPlan);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, description, testCaseIds } = req.body;
    
    const { data: existingPlan, error: fetchError } = await supabase
      .from('test_plans')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existingPlan) {
      return res.status(404).json({ error: 'Test plan not found' });
    }

    const { data: testPlan, error: updateError } = await supabase
      .from('test_plans')
      .update({
        name,
        description,
        test_case_ids: testCaseIds || []
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update test plan' });
    }
    
    await supabase
      .from('test_plan_assignments')
      .delete()
      .eq('plan_id', req.params.id);
    
    if (testCaseIds && testCaseIds.length > 0) {
      const assignments = testCaseIds.map((testCaseId: string) => ({
        test_case_id: testCaseId,
        plan_id: req.params.id
      }));

      await supabase.from('test_plan_assignments').insert(assignments);
    }
    
    const formattedPlan = {
      ...testPlan,
      testCaseIds: testPlan.test_case_ids,
      createdBy: testPlan.created_by,
      createdAt: testPlan.created_at,
      updatedAt: testPlan.updated_at
    };

    res.json(formattedPlan);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('test_plans')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete test plan' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;