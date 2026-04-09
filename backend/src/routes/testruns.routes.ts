import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isAdmin = (req: AuthRequest) => req.userRole === 'admin';

async function getRunRole(runId: string, userId: string, userRole?: string): Promise<string | null> {
  if (userRole === 'admin') return 'owner';

  const { data: run } = await supabase.from('test_runs').select('started_by').eq('id', runId).single();
  if (!run) return null;
  if (run.started_by === userId) return 'owner';

  const { data: collab } = await supabase.from('testrun_collaborators').select('role').eq('testrun_id', runId).eq('user_id', userId).single();
  return collab?.role ?? null;
}

async function formatRunCollaborators(runId: string) {
  const { data } = await supabase
    .from('testrun_collaborators')
    .select(`
      id, role, created_at,
      user:users!testrun_collaborators_user_id_fkey (id, username, email),
      inviter:users!testrun_collaborators_invited_by_fkey (id, username)
    `)
    .eq('testrun_id', runId)
    .order('created_at', { ascending: true });

  return (data || []).map((c: any) => ({
    id: c.id, role: c.role,
    userId: c.user?.id, username: c.user?.username, email: c.user?.email,
    invitedBy: c.inviter?.username, createdAt: c.created_at,
  }));
}

// ─── List ─────────────────────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res) => {
  try {
    const page   = parseInt(req.query.page  as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (isAdmin(req)) {
      const { data: runs, error, count } = await supabase
        .from('test_runs')
        .select(`*, test_plans (id, name, description)`, { count: 'exact' })
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) return res.status(500).json({ error: 'Failed to fetch test runs' });

      const formatted = await Promise.all((runs || []).map(async (run: any) => {
        const { count: rc } = await supabase.from('test_results').select('*', { count: 'exact', head: true }).eq('test_run_id', run.id);
        return { ...run, testPlan: run.test_plans, testPlanId: run.test_plan_id, startedBy: run.started_by, startedAt: run.started_at, completedAt: run.completed_at, _count: { results: rc || 0 }, isOwner: true, collaborationRole: 'owner' };
      }));
      return res.json({ data: formatted, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } });
    }

    const { data: ownRuns } = await supabase
      .from('test_runs')
      .select(`*, test_plans (id, name, description)`)
      .eq('started_by', req.dbUserId!)
      .order('started_at', { ascending: false });

    const { data: collabRows } = await supabase.from('testrun_collaborators').select('testrun_id, role').eq('user_id', req.dbUserId!);
    const collabIds    = (collabRows || []).map(r => r.testrun_id);
    const collabRoleMap = Object.fromEntries((collabRows || []).map(r => [r.testrun_id, r.role]));

    let collabRuns: any[] = [];
    if (collabIds.length > 0) {
      const { data: cr } = await supabase.from('test_runs').select(`*, test_plans (id, name, description)`).in('id', collabIds).order('started_at', { ascending: false });
      collabRuns = cr || [];
    }

    const fmtRun = async (run: any, isOwner: boolean, collabRole: string) => {
      const { count } = await supabase.from('test_results').select('*', { count: 'exact', head: true }).eq('test_run_id', run.id);
      return { ...run, testPlan: run.test_plans, testPlanId: run.test_plan_id, startedBy: run.started_by, startedAt: run.started_at, completedAt: run.completed_at, _count: { results: count || 0 }, isOwner, collaborationRole: collabRole };
    };

    const ownIds   = new Set((ownRuns || []).map((r: any) => r.id));
    const all = [
      ...await Promise.all((ownRuns || []).map(r => fmtRun(r, true, 'owner'))),
      ...await Promise.all(collabRuns.filter(r => !ownIds.has(r.id)).map(r => fmtRun(r, false, collabRoleMap[r.id]))),
    ];

    res.json({ data: all.slice(offset, offset + limit), pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Detail ───────────────────────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getRunRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    const page          = parseInt(req.query.page          as string) || 1;
    const limit         = parseInt(req.query.limit         as string) || 10;
    const resultsOffset = parseInt(req.query.resultsOffset as string) || 0;

    const { data: runData, error } = await supabase.from('test_runs').select(`*, test_plans (id, name, description)`).eq('id', id).single();
    if (error || !runData) return res.status(404).json({ error: 'Test run not found' });

    const { data: results, count } = await supabase
      .from('test_results')
      .select(`*, test_cases (id, title, description, status, priority)`, { count: 'exact' })
      .eq('test_run_id', id)
      .order('created_at', { ascending: false })
      .range(resultsOffset, resultsOffset + limit - 1);

    const collaborators = await formatRunCollaborators(id);

    res.json({
      ...runData,
      testPlan: runData.test_plans, testPlanId: runData.test_plan_id,
      startedBy: runData.started_by, startedAt: runData.started_at, completedAt: runData.completed_at,
      isOwner: role === 'owner', collaborationRole: role, collaborators,
      results: (results || []).map((r: any) => ({ ...r, testCase: r.test_cases, testRunId: r.test_run_id, testCaseId: r.test_case_id, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at })),
      resultsCount: count || 0,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Create ───────────────────────────────────────────────────────────────────

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { testPlanId, name } = req.body;
    const { data: testPlan, error: planError } = await supabase.from('test_plans').select('*').eq('id', testPlanId).single();
    if (planError || !testPlan) return res.status(404).json({ error: 'Test plan not found' });

    const { data: testRun, error: insertError } = await supabase.from('test_runs').insert({ test_plan_id: testPlanId, name, started_by: req.dbUserId! }).select().single();
    if (insertError) return res.status(500).json({ error: 'Failed to create test run' });

    let testCaseIds = testPlan.test_case_ids;
    if (typeof testCaseIds === 'string') { try { testCaseIds = JSON.parse(testCaseIds); } catch { testCaseIds = []; } }

    if (testCaseIds && Array.isArray(testCaseIds) && testCaseIds.length > 0) {
      const { error: resultsError } = await supabase.from('test_results').insert(
        testCaseIds.map((id: string) => ({ test_run_id: testRun.id, test_case_id: id, status: 'SKIP', created_by: req.dbUserId! }))
      );
      if (resultsError) return res.status(500).json({ error: 'Failed to create test results' });
    }

    res.status(201).json({ ...testRun, testPlanId: testRun.test_plan_id, startedBy: testRun.started_by, startedAt: testRun.started_at, completedAt: testRun.completed_at });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update ───────────────────────────────────────────────────────────────────

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getRunRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot edit' });

    const { status } = req.body;
    const { data: testRun, error } = await supabase
      .from('test_runs')
      .update({ status, ...(status === 'COMPLETED' && { completed_at: new Date().toISOString() }) })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'Failed to update test run' });

    res.json({ ...testRun, testPlanId: testRun.test_plan_id, startedBy: testRun.started_by, startedAt: testRun.started_at, completedAt: testRun.completed_at });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Delete ───────────────────────────────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getRunRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can delete' });

    const { data: deleted, error } = await supabase.from('test_runs').delete().eq('id', id).select('id');
    if (error) return res.status(500).json({ error: 'Failed to delete test run' });
    if (!deleted || deleted.length === 0) return res.status(500).json({ error: 'Delete failed: no rows affected (check Supabase service role key and RLS configuration)' });
    res.status(204).send();
  } catch (err) {
    console.error('Delete test run error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update result ────────────────────────────────────────────────────────────

router.post('/:id/results', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getRunRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot update results' });

    const { testCaseId, status, actualResult, screenshots, notes } = req.body;
    const { data: updatedResult, error } = await supabase
      .from('test_results')
      .update({ status, actual_result: actualResult, screenshots: screenshots || [], notes })
      .eq('test_run_id', id)
      .eq('test_case_id', testCaseId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'Failed to update test result', details: error.message });

    res.json({ success: true, data: updatedResult });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Collaborators ────────────────────────────────────────────────────────────

router.get('/:id/collaborators', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getRunRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    res.json(await formatRunCollaborators(id));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/collaborators', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getRunRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can invite collaborators' });

    const { username, collabRole = 'viewer' } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });

    const { data: targetUser } = await supabase.from('users').select('id, username').ilike('username', username).single();
    if (!targetUser) return res.status(404).json({ error: `User "${username}" not found` });
    if (targetUser.id === req.dbUserId) return res.status(400).json({ error: 'Cannot invite yourself' });

    const { error } = await supabase
      .from('testrun_collaborators')
      .upsert({ testrun_id: id, user_id: targetUser.id, role: collabRole, invited_by: req.dbUserId! as string }, { onConflict: 'testrun_id,user_id' });
    if (error) return res.status(500).json({ error: 'Failed to add collaborator' });

    res.status(201).json({ message: `${targetUser.username} added as ${collabRole}` });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/collaborators/:userId', async (req: AuthRequest, res) => {
  try {
    const id     = req.params.id     as string;
    const userId = req.params.userId as string;
    const role   = await getRunRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can remove collaborators' });

    const { error } = await supabase.from('testrun_collaborators').delete().eq('testrun_id', id).eq('user_id', userId);
    if (error) return res.status(500).json({ error: 'Failed to remove collaborator' });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
