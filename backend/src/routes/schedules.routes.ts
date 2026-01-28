import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { data: schedule, error } = await supabase
      .from('test_schedules')
      .select(`
        *,
        test_plans (
          id,
          name,
          description
        )
      `)
      .eq('id', req.params.id)
      .eq('created_by', req.userId!)
      .single();

    if (error || !schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const formattedSchedule = {
      ...schedule,
      testPlan: schedule.test_plans,
      testPlanId: schedule.test_plan_id,
      cronExpression: schedule.cron_expression,
      createdBy: schedule.created_by,
      createdAt: schedule.created_at,
      lastRunAt: schedule.last_run_at,
      nextRunAt: schedule.next_run_at
    };

    res.json(formattedSchedule);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: schedules, error } = await supabase
      .from('test_schedules')
      .select(`
        *,
        test_plans (
          id,
          name,
          description
        )
      `)
      .eq('created_by', req.userId!)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch schedules' });
    }

    const formattedSchedules = schedules?.map((schedule: any) => ({
      ...schedule,
      testPlan: schedule.test_plans,
      testPlanId: schedule.test_plan_id,
      cronExpression: schedule.cron_expression,
      createdBy: schedule.created_by,
      createdAt: schedule.created_at,
      lastRunAt: schedule.last_run_at,
      nextRunAt: schedule.next_run_at
    })) || [];

    res.json(formattedSchedules);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { testPlanId, name, cronExpression, active } = req.body;
    
    const { data: schedule, error } = await supabase
      .from('test_schedules')
      .insert({
        test_plan_id: testPlanId,
        name,
        cron_expression: cronExpression,
        active: active ?? true,
        created_by: req.userId!
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create schedule' });
    }
    
    const formattedSchedule = {
      ...schedule,
      testPlanId: schedule.test_plan_id,
      cronExpression: schedule.cron_expression,
      createdBy: schedule.created_by,
      createdAt: schedule.created_at,
      lastRunAt: schedule.last_run_at,
      nextRunAt: schedule.next_run_at
    };

    res.status(201).json(formattedSchedule);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, cronExpression, active } = req.body;
    
    const { data: schedule, error } = await supabase
      .from('test_schedules')
      .update({
        name,
        cron_expression: cronExpression,
        active
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update schedule' });
    }
    
    const formattedSchedule = {
      ...schedule,
      testPlanId: schedule.test_plan_id,
      cronExpression: schedule.cron_expression,
      createdBy: schedule.created_by,
      createdAt: schedule.created_at,
      lastRunAt: schedule.last_run_at,
      nextRunAt: schedule.next_run_at
    };

    res.json(formattedSchedule);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('test_schedules')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete schedule' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;