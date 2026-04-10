import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/ping', (_req, res) => {
  res.json({ message: 'Ping received', timestamp: new Date().toISOString() });
});

router.get('/auth-test', authMiddleware, async (req: AuthRequest, res) => {
  res.json({ message: 'Auth test passed', userId: req.userId, dbUserId: req.dbUserId });
});

router.use(authMiddleware);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isAdmin = (req: AuthRequest) => req.userRole === 'admin';

async function getSuiteRole(suiteId: string, userId: string, userRole?: string): Promise<string | null> {
  if (userRole === 'admin') return 'owner';

  const { data: suite } = await supabase
    .from('test_suites')
    .select('created_by')
    .eq('id', suiteId)
    .single();
  if (!suite) return null;
  if (suite.created_by === userId) return 'owner';

  const { data: collab } = await supabase
    .from('suite_collaborators')
    .select('role')
    .eq('suite_id', suiteId)
    .eq('user_id', userId)
    .single();
  return collab?.role ?? null;
}

async function formatSuiteCollaborators(suiteId: string) {
  const { data } = await supabase
    .from('suite_collaborators')
    .select(`
      id, role, created_at,
      user:users!suite_collaborators_user_id_fkey (id, username, email),
      inviter:users!suite_collaborators_invited_by_fkey (id, username)
    `)
    .eq('suite_id', suiteId)
    .order('created_at', { ascending: true });

  return (data || []).map((c: any) => ({
    id: c.id,
    role: c.role,
    userId: c.user?.id,
    username: c.user?.username,
    email: c.user?.email,
    invitedBy: c.inviter?.username,
    createdAt: c.created_at,
  }));
}

async function formatSuite(suite: any, includeCollaborators = false) {
  const { count } = await supabase
    .from('test_cases')
    .select('*', { count: 'exact', head: true })
    .eq('suite_id', suite.id);

  const base: any = {
    ...suite,
    parentId: suite.parent_id,
    createdBy: suite.created_by,
    createdAt: suite.created_at,
    updatedAt: suite.updated_at,
    children: await Promise.all((suite.children || []).map(async (child: any) => {
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
        _count: { testCases: childCount || 0 },
      };
    })),
    _count: { testCases: count || 0 },
  };

  if (includeCollaborators) {
    base.collaborators = await formatSuiteCollaborators(suite.id);
  }
  return base;
}

// ─── List ─────────────────────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res) => {
  try {
    const page   = parseInt(req.query.page  as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (isAdmin(req)) {
      const { data: suites, error, count } = await supabase
        .from('test_suites')
        .select(`*, children:test_suites (id, name, code, description, parent_id, created_by, created_at, updated_at)`, { count: 'exact' })
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) return res.status(500).json({ error: 'Failed to fetch test suites' });
      const formatted = await Promise.all((suites || []).map(s => formatSuite(s)));
      return res.json({ data: formatted.map(s => ({ ...s, isOwner: true, collaborationRole: 'owner' })), pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } });
    }

    const { data: ownSuites } = await supabase
      .from('test_suites')
      .select(`*, children:test_suites (id, name, code, description, parent_id, created_by, created_at, updated_at)`)
      .eq('created_by', req.dbUserId!)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    const { data: collabRows } = await supabase
      .from('suite_collaborators')
      .select('suite_id, role')
      .eq('user_id', req.dbUserId!);

    const collabIds     = (collabRows || []).map(r => r.suite_id);
    const collabRoleMap = Object.fromEntries((collabRows || []).map(r => [r.suite_id, r.role]));

    let collabSuites: any[] = [];
    if (collabIds.length > 0) {
      const { data: cs } = await supabase
        .from('test_suites')
        .select(`*, children:test_suites (id, name, code, description, parent_id, created_by, created_at, updated_at)`)
        .in('id', collabIds)
        .is('parent_id', null)
        .order('created_at', { ascending: false });
      collabSuites = cs || [];
    }

    const ownFormatted    = await Promise.all((ownSuites    || []).map(s => formatSuite(s)));
    const collabFormatted = await Promise.all( collabSuites       .map(s => formatSuite(s)));

    const ownIds = new Set((ownSuites || []).map((s: any) => s.id));
    const all = [
      ...ownFormatted.map(s => ({ ...s, isOwner: true,  collaborationRole: 'owner' })),
      ...collabFormatted.filter(s => !ownIds.has(s.id)).map(s => ({ ...s, isOwner: false, collaborationRole: collabRoleMap[s.id] })),
    ];

    const paginated = all.slice(offset, offset + limit);
    res.json({ data: paginated, pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Detail ───────────────────────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getSuiteRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    const { data: testSuite, error } = await supabase
      .from('test_suites')
      .select(`*, children:test_suites (id, name, code, description, parent_id, created_by, created_at, updated_at)`)
      .eq('id', id)
      .single();
    if (error || !testSuite) return res.status(404).json({ error: 'Test suite not found' });

    const formatted = await formatSuite(testSuite, true);
    res.json({ ...formatted, isOwner: role === 'owner', collaborationRole: role });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Create ───────────────────────────────────────────────────────────────────

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, description, parentId, code } = req.body;
    const normalizedCode = code ? code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) : null;
    const { data: testSuite, error } = await supabase
      .from('test_suites')
      .insert({ name, description, parent_id: parentId || null, created_by: req.dbUserId!, code: normalizedCode })
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'Failed to create test suite', details: error.message });
    res.status(201).json({ ...testSuite, parentId: testSuite.parent_id, createdBy: testSuite.created_by, createdAt: testSuite.created_at, updatedAt: testSuite.updated_at });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update ───────────────────────────────────────────────────────────────────

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getSuiteRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot edit' });

    const { name, description, parentId, code } = req.body;
    const normalizedCode = code !== undefined ? (code ? code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) : null) : undefined;
    const updatePayload: any = { name, description, parent_id: parentId };
    if (normalizedCode !== undefined) updatePayload.code = normalizedCode;
    const { data: testSuite, error } = await supabase
      .from('test_suites')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'Failed to update test suite' });
    res.json({ ...testSuite, parentId: testSuite.parent_id, createdBy: testSuite.created_by, createdAt: testSuite.created_at, updatedAt: testSuite.updated_at });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Delete ───────────────────────────────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getSuiteRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can delete' });

    const { data: deleted, error } = await supabase.from('test_suites').delete().eq('id', id).select('id');
    if (error) return res.status(500).json({ error: 'Failed to delete test suite' });
    if (!deleted || deleted.length === 0) return res.status(500).json({ error: 'Delete failed: no rows affected (check Supabase service role key and RLS configuration)' });
    res.status(204).send();
  } catch (err) {
    console.error('Delete test suite error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Collaborators ────────────────────────────────────────────────────────────

router.get('/:id/collaborators', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getSuiteRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    res.json(await formatSuiteCollaborators(id));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/collaborators', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getSuiteRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can invite collaborators' });

    const { username, collabRole = 'viewer' } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });

    const { data: targetUser } = await supabase.from('users').select('id, username, email').ilike('username', username).single();
    if (!targetUser) return res.status(404).json({ error: `User "${username}" not found` });
    if (targetUser.id === req.dbUserId) return res.status(400).json({ error: 'Cannot invite yourself' });

    const { error } = await supabase
      .from('suite_collaborators')
      .upsert({ suite_id: id, user_id: targetUser.id, role: collabRole, invited_by: req.dbUserId! as string }, { onConflict: 'suite_id,user_id' });
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
    const role   = await getSuiteRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can remove collaborators' });

    const { error } = await supabase.from('suite_collaborators').delete().eq('suite_id', id).eq('user_id', userId);
    if (error) return res.status(500).json({ error: 'Failed to remove collaborator' });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
