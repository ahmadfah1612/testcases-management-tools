import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [casesCount, suitesCount, plansCount, runsCount] = await Promise.all([
      supabase.from('test_cases').select('*', { count: 'exact', head: true }).eq('created_by', req.userId!),
      supabase.from('test_suites').select('*', { count: 'exact', head: true }).eq('created_by', req.userId!),
      supabase.from('test_plans').select('*', { count: 'exact', head: true }).eq('created_by', req.userId!),
      supabase.from('test_runs').select('*', { count: 'exact', head: true }).eq('started_by', req.userId!)
    ]);

    const { data: resultsData } = await supabase
      .from('test_results')
      .select('status')
      .eq('created_by', req.userId!);

    const totalCases = casesCount.count || 0;
    const totalSuites = suitesCount.count || 0;
    const totalPlans = plansCount.count || 0;
    const totalRuns = runsCount.count || 0;

    const results: any = {};
    if (resultsData) {
      resultsData.forEach(item => {
        results[item.status] = (results[item.status] || 0) + 1;
      });
    }

    const totalResults = Object.values(results).reduce((sum: number, count: any) => sum + count, 0);
    const passRate = totalResults > 0 ? ((results.PASS || 0) / totalResults) * 100 : 0;

    const stats = {
      totalCases,
      totalSuites,
      totalPlans,
      totalRuns,
      passRate,
      results
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/trends', async (req: AuthRequest, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: trendsData } = await supabase
      .from('test_results')
      .select('status')
      .eq('created_by', req.userId!)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const trends: any = {};
    if (trendsData) {
      trendsData.forEach(item => {
        trends[item.status] = (trends[item.status] || 0) + 1;
      });
    }

    const formattedTrends = Object.entries(trends).map(([status, count]) => ({
      status,
      _count: count
    }));

    res.json(formattedTrends);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;