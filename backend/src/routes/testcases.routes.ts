import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isAdmin = (req: AuthRequest) => req.userRole === 'admin';

async function getTestCaseRole(testCaseId: string, userId: string, userRole?: string): Promise<string | null> {
  if (userRole === 'admin') return 'owner';

  const { data: tc } = await supabase
    .from('test_cases')
    .select('created_by, suite_id')
    .eq('id', testCaseId)
    .single();
  if (!tc) return null;
  if (tc.created_by === userId) return 'owner';

  const { data: tcCollab } = await supabase
    .from('testcase_collaborators')
    .select('role')
    .eq('testcase_id', testCaseId)
    .eq('user_id', userId)
    .single();
  if (tcCollab) return tcCollab.role;

  const { data: suiteCollab } = await supabase
    .from('suite_collaborators')
    .select('role')
    .eq('suite_id', tc.suite_id)
    .eq('user_id', userId)
    .single();
  return suiteCollab?.role ?? null;
}

async function formatTestCaseCollaborators(testCaseId: string) {
  const { data } = await supabase
    .from('testcase_collaborators')
    .select(`
      id, role, created_at,
      user:users!testcase_collaborators_user_id_fkey (id, username, email),
      inviter:users!testcase_collaborators_invited_by_fkey (id, username)
    `)
    .eq('testcase_id', testCaseId)
    .order('created_at', { ascending: true });

  return (data || []).map((c: any) => ({
    id: c.id, role: c.role,
    userId: c.user?.id, username: c.user?.username, email: c.user?.email,
    invitedBy: c.inviter?.username, createdAt: c.created_at,
  }));
}

function parseJsonField(val: any) {
  return typeof val === 'string' ? JSON.parse(val) : (val ?? []);
}

async function generateCustomId(suiteId: string): Promise<string | null> {
  const { data: suite } = await supabase
    .from('test_suites')
    .select('code')
    .eq('id', suiteId)
    .single();

  if (!suite?.code) return null;

  const prefix = suite.code + '-';
  const { data: cases } = await supabase
    .from('test_cases')
    .select('custom_id')
    .eq('suite_id', suiteId)
    .not('custom_id', 'is', null);

  let maxNum = 0;
  for (const tc of (cases || [])) {
    if (tc.custom_id?.startsWith(prefix)) {
      const numPart = parseInt(tc.custom_id.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
    }
  }

  return `${suite.code}-${String(maxNum + 1).padStart(3, '0')}`;
}

// ─── List ─────────────────────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { suiteId, status, priority, page = '1', limit = '10' } = req.query;
    const pageNum  = parseInt(page  as string);
    const limitNum = parseInt(limit as string);
    const offset   = (pageNum - 1) * limitNum;

    if (isAdmin(req)) {
      let q = supabase
        .from('test_cases')
        .select(`*, test_suites (id, name, description)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);
      if (suiteId)  q = q.eq('suite_id', suiteId  as string);
      if (status)   q = q.eq('status',   status   as string);
      if (priority) q = q.eq('priority', priority as string);
      const { data, error, count } = await q;
      if (error) return res.status(500).json({ error: 'Failed to fetch test cases' });
      const formatted = (data || []).map(tc => ({ ...tc, suite: (tc as any).test_suites, suiteId: tc.suite_id, createdBy: tc.created_by, createdAt: tc.created_at, updatedAt: tc.updated_at, steps: parseJsonField(tc.steps), tags: parseJsonField(tc.tags), isOwner: true, collaborationRole: 'owner' }));
      return res.json({ data: formatted, pagination: { page: pageNum, limit: limitNum, total: count || 0, totalPages: Math.ceil((count || 0) / limitNum) } });
    }

    // Own test cases
    let ownQ = supabase.from('test_cases').select(`*, test_suites (id, name, description)`).eq('created_by', req.dbUserId!).order('created_at', { ascending: false });
    if (suiteId)  ownQ = ownQ.eq('suite_id', suiteId  as string);
    if (status)   ownQ = ownQ.eq('status',   status   as string);
    if (priority) ownQ = ownQ.eq('priority', priority as string);
    const { data: ownData } = await ownQ;

    // Direct testcase collaborations
    const { data: tcCollabs } = await supabase.from('testcase_collaborators').select('testcase_id, role').eq('user_id', req.dbUserId!);
    const tcCollabIds  = (tcCollabs || []).map(r => r.testcase_id);
    const tcRoleMap    = Object.fromEntries((tcCollabs || []).map(r => [r.testcase_id, r.role]));

    // Suite-level collaborations cascade
    const { data: suiteCollabs } = await supabase.from('suite_collaborators').select('suite_id, role').eq('user_id', req.dbUserId!);
    const collabSuiteIds = (suiteCollabs || []).map(r => r.suite_id);
    const suiteRoleMap   = Object.fromEntries((suiteCollabs || []).map(r => [r.suite_id, r.role]));

    const sharedCases: any[] = [];
    const sharedIds = new Set<string>();

    if (tcCollabIds.length > 0) {
      let q2 = supabase.from('test_cases').select(`*, test_suites (id, name, description)`).in('id', tcCollabIds).order('created_at', { ascending: false });
      if (suiteId)  q2 = q2.eq('suite_id', suiteId  as string);
      if (status)   q2 = q2.eq('status',   status   as string);
      if (priority) q2 = q2.eq('priority', priority as string);
      const { data: td } = await q2;
      (td || []).forEach(tc => { sharedCases.push({ ...tc, _collabRole: tcRoleMap[tc.id] }); sharedIds.add(tc.id); });
    }

    if (collabSuiteIds.length > 0) {
      let q3 = supabase.from('test_cases').select(`*, test_suites (id, name, description)`).in('suite_id', collabSuiteIds).order('created_at', { ascending: false });
      if (suiteId)  q3 = q3.eq('suite_id', suiteId  as string);
      if (status)   q3 = q3.eq('status',   status   as string);
      if (priority) q3 = q3.eq('priority', priority as string);
      const { data: sd } = await q3;
      (sd || []).forEach(tc => { if (!sharedIds.has(tc.id)) { sharedCases.push({ ...tc, _collabRole: suiteRoleMap[tc.suite_id] }); sharedIds.add(tc.id); } });
    }

    const fmt = (tc: any, isOwner: boolean, collabRole: string) => ({
      ...tc, suite: tc.test_suites, suiteId: tc.suite_id, createdBy: tc.created_by, createdAt: tc.created_at, updatedAt: tc.updated_at,
      steps: parseJsonField(tc.steps), tags: parseJsonField(tc.tags), isOwner, collaborationRole: collabRole,
    });

    const ownIds  = new Set((ownData || []).map((tc: any) => tc.id));
    const all     = [
      ...(ownData || []).map(tc => fmt(tc, true, 'owner')),
      ...sharedCases.filter(tc => !ownIds.has(tc.id)).map(tc => fmt(tc, false, tc._collabRole)),
    ];

    res.json({ data: all.slice(offset, offset + limitNum), pagination: { page: pageNum, limit: limitNum, total: all.length, totalPages: Math.ceil(all.length / limitNum) } });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Export (before /:id) ─────────────────────────────────────────────────────

router.get('/export', async (req: AuthRequest, res) => {
  try {
    const suiteId = req.query.suiteId as string | undefined;

    let query = supabase.from('test_cases').select(`*, test_suites (id, name)`).order('created_at', { ascending: false });
    if (!isAdmin(req)) query = query.eq('created_by', req.dbUserId!);
    if (suiteId) query = query.eq('suite_id', suiteId);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Failed to fetch test cases' });

    const formatted = (data || []).map(tc => ({
      title: tc.title,
      description: tc.description || '',
      suiteName: (tc as any).test_suites?.name || '',
      expectedResult: tc.expected_result || '',
      steps: JSON.stringify(parseJsonField(tc.steps)),
      status: tc.status,
      priority: tc.priority,
      tags: Array.isArray(tc.tags) ? tc.tags.join('|') : parseJsonField(tc.tags).join('|'),
    }));

    res.json({ data: formatted });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Bulk import (before /:id) ────────────────────────────────────────────────

router.post('/bulk-import', async (req: AuthRequest, res) => {
  try {
    const { testCases } = req.body as { testCases: any[] };
    if (!Array.isArray(testCases) || testCases.length === 0)
      return res.status(400).json({ error: 'testCases must be a non-empty array' });

    const { data: suites } = await supabase.from('test_suites').select('id, name').eq('created_by', req.dbUserId!);
    const suiteMap = new Map<string, string>((suites || []).map(s => [s.name.toLowerCase(), s.id]));

    const toInsert: any[] = [];
    const errors: { row: number; reason: string }[] = [];

    testCases.forEach((tc, i) => {
      const row = i + 1;
      if (!tc.title?.trim())         { errors.push({ row, reason: 'title is required' }); return; }
      if (!tc.suiteName?.trim())      { errors.push({ row, reason: 'suiteName is required' }); return; }
      if (!tc.expectedResult?.trim()) { errors.push({ row, reason: 'expectedResult is required' }); return; }

      const suiteId = suiteMap.get(tc.suiteName.trim().toLowerCase());
      if (!suiteId) { errors.push({ row, reason: `Suite "${tc.suiteName}" not found` }); return; }

      let steps: any[] = [];
      if (tc.steps) { try { steps = typeof tc.steps === 'string' ? JSON.parse(tc.steps) : tc.steps; } catch { steps = []; } }

      let tags: string[] = [];
      if (tc.tags) { tags = Array.isArray(tc.tags) ? tc.tags : tc.tags.split('|').map((t: string) => t.trim()).filter(Boolean); }

      const validStatuses   = ['DRAFT', 'READY', 'REVIEW', 'APPROVED'];
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      toInsert.push({
        suite_id: suiteId, title: tc.title.trim(), description: tc.description?.trim() || '',
        steps, expected_result: tc.expectedResult.trim(),
        status:   validStatuses.includes(tc.status?.toUpperCase())     ? tc.status.toUpperCase()   : 'DRAFT',
        priority: validPriorities.includes(tc.priority?.toUpperCase()) ? tc.priority.toUpperCase() : 'MEDIUM',
        tags, created_by: req.dbUserId!,
      });
    });

    if (toInsert.length === 0) return res.status(400).json({ imported: 0, failed: errors.length, errors });

    // Build per-suite code + max sequence number for custom_id generation
    const suiteCodeMap = new Map<string, string>();
    const suiteCounterMap = new Map<string, number>();
    const uniqueSuiteIds = [...new Set(toInsert.map((r: any) => r.suite_id))];
    for (const sid of uniqueSuiteIds) {
      const { data: suite } = await supabase.from('test_suites').select('code').eq('id', sid).single();
      if (!suite?.code) continue;
      suiteCodeMap.set(sid, suite.code);
      const prefix = suite.code + '-';
      const { data: cases } = await supabase.from('test_cases').select('custom_id').eq('suite_id', sid).not('custom_id', 'is', null);
      let maxNum = 0;
      for (const tc of (cases || [])) {
        if (tc.custom_id?.startsWith(prefix)) {
          const n = parseInt(tc.custom_id.slice(prefix.length), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
      suiteCounterMap.set(sid, maxNum);
    }
    for (const record of toInsert) {
      const code = suiteCodeMap.get(record.suite_id);
      if (code) {
        const next = (suiteCounterMap.get(record.suite_id) || 0) + 1;
        suiteCounterMap.set(record.suite_id, next);
        record.custom_id = `${code}-${String(next).padStart(3, '0')}`;
      }
    }

    const { data: inserted, error: insertError } = await supabase.from('test_cases').insert(toInsert).select('id');
    if (insertError) return res.status(500).json({ error: 'Failed to insert test cases', detail: insertError.message });

    const versionRecords = (inserted || []).map(tc => ({ test_case_id: tc.id, version: 1, changes: 'Bulk import', created_by: req.dbUserId! }));
    if (versionRecords.length > 0) await supabase.from('test_case_versions').insert(versionRecords);

    res.status(201).json({ imported: inserted?.length || 0, failed: errors.length, errors });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Detail ───────────────────────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getTestCaseRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    const { data: tc, error } = await supabase
      .from('test_cases')
      .select(`*, test_suites (id, name, description)`)
      .eq('id', id)
      .single();
    if (error || !tc) return res.status(404).json({ error: 'Test case not found' });

    const { data: versions } = await supabase.from('test_case_versions').select('*').eq('test_case_id', id).order('created_at', { ascending: false });
    const collaborators = await formatTestCaseCollaborators(id);

    res.json({
      ...tc,
      suite: (tc as any).test_suites, suiteId: tc.suite_id, createdBy: tc.created_by, createdAt: tc.created_at, updatedAt: tc.updated_at,
      steps: parseJsonField(tc.steps), tags: parseJsonField(tc.tags),
      isOwner: role === 'owner', collaborationRole: role, collaborators,
      versions: (versions || []).map(v => ({ ...v, testCaseId: v.test_case_id, createdBy: v.created_by, createdAt: v.created_at })),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Create ───────────────────────────────────────────────────────────────────

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { suiteId, title, description, steps, expectedResult, status, priority, tags } = req.body;
    const customId = await generateCustomId(suiteId);
    const { data: tc, error } = await supabase
      .from('test_cases')
      .insert({ suite_id: suiteId, title, description, steps: steps || [], expected_result: expectedResult, status: status || 'DRAFT', priority: priority || 'MEDIUM', tags: tags || [], created_by: req.dbUserId!, custom_id: customId })
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'Failed to create test case' });

    await supabase.from('test_case_versions').insert({ test_case_id: tc.id, version: 1, changes: 'Initial version', created_by: req.dbUserId! });

    res.status(201).json({ ...tc, suiteId: tc.suite_id, createdBy: tc.created_by, createdAt: tc.created_at, updatedAt: tc.updated_at, steps: parseJsonField(tc.steps), tags: parseJsonField(tc.tags) });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update ───────────────────────────────────────────────────────────────────

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getTestCaseRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot edit' });

    const { suiteId, title, description, steps, expectedResult, status, priority, tags } = req.body;
    const { data: existing } = await supabase.from('test_cases').select('version').eq('id', id).single();
    const nextVersion = (existing?.version || 1) + 1;

    const { data: updated, error } = await supabase
      .from('test_cases')
      .update({ suite_id: suiteId, title, description, steps: steps || [], expected_result: expectedResult, status, priority, tags, version: nextVersion })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'Failed to update test case' });

    await supabase.from('test_case_versions').insert({ test_case_id: id, version: nextVersion, changes: 'Updated test case', created_by: req.dbUserId! });

    res.json({ ...updated, suiteId: updated.suite_id, createdBy: updated.created_by, createdAt: updated.created_at, updatedAt: updated.updated_at, steps: parseJsonField(updated.steps), tags: parseJsonField(updated.tags) });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Delete ───────────────────────────────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getTestCaseRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can delete' });

    const { data: deleted, error } = await supabase.from('test_cases').delete().eq('id', id).select('id');
    if (error) return res.status(500).json({ error: 'Failed to delete test case' });
    if (!deleted || deleted.length === 0) return res.status(500).json({ error: 'Delete failed: no rows affected (check Supabase service role key and RLS configuration)' });
    res.status(204).send();
  } catch (err) {
    console.error('Delete test case error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Collaborators ────────────────────────────────────────────────────────────

router.get('/:id/collaborators', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getTestCaseRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    res.json(await formatTestCaseCollaborators(id));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/collaborators', async (req: AuthRequest, res) => {
  try {
    const id   = req.params.id as string;
    const role = await getTestCaseRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can invite collaborators' });

    const { username, collabRole = 'viewer' } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });

    const { data: targetUser } = await supabase.from('users').select('id, username').ilike('username', username).single();
    if (!targetUser) return res.status(404).json({ error: `User "${username}" not found` });
    if (targetUser.id === req.dbUserId) return res.status(400).json({ error: 'Cannot invite yourself' });

    const { error } = await supabase
      .from('testcase_collaborators')
      .upsert({ testcase_id: id, user_id: targetUser.id, role: collabRole, invited_by: req.dbUserId! as string }, { onConflict: 'testcase_id,user_id' });
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
    const role   = await getTestCaseRole(id, req.dbUserId! as string, req.userRole);
    if (!role) return res.status(403).json({ error: 'Access denied' });
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can remove collaborators' });

    const { error } = await supabase.from('testcase_collaborators').delete().eq('testcase_id', id).eq('user_id', userId);
    if (error) return res.status(500).json({ error: 'Failed to remove collaborator' });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
