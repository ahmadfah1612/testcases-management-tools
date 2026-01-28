'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { Activity, TrendingUp, TrendingDown, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Stats {
  totalCases: number;
  totalSuites: number;
  totalPlans: number;
  totalRuns: number;
  passRate: number;
  results: {
    PASS?: number;
    FAIL?: number;
    SKIP?: number;
  };
}

interface Trend {
  status: string;
  _count: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [statsData, trendsData] = await Promise.all([
        api.get('/reports/stats'),
        api.get(`/reports/trends?period=${period}`)
      ]);
      
      setStats(statsData);
      setTrends(trendsData);
    } catch (error) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const maxTrendCount = Math.max(...trends.map(t => t._count));
  const passTrend = trends.find(t => t.status === 'PASS');
  const failTrend = trends.find(t => t.status === 'FAIL');
  const skipTrend = trends.find(t => t.status === 'SKIP');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-2xl font-bold uppercase">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold uppercase mb-4">Reports Not Available</h2>
            <NeoButton
              variant="primary"
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </NeoButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase">Reports</h1>
          <p className="text-gray-600">View test execution statistics and trends</p>
        </div>
        <NeoButton
          variant="secondary"
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2"
        >
          Back
        </NeoButton>
      </div>

      <NeoCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold uppercase">Time Period</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="p-2 border-2 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </NeoCard>

      <NeoCard>
        <h2 className="text-2xl font-bold uppercase mb-4">Overview Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="border-4 border-black bg-white p-4 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-[rgb(0,191,255)]" />
              <div className="text-sm text-gray-600 uppercase">Test Cases</div>
            </div>
            <div className="text-5xl font-bold">{stats.totalCases}</div>
          </div>

          <div className="border-4 border-black bg-[rgb(57,255,20)]/20 p-4 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-[rgb(57,255,20)]" />
              <div className="text-sm text-gray-600 uppercase">Test Suites</div>
            </div>
            <div className="text-5xl font-bold">{stats.totalSuites}</div>
          </div>

          <div className="border-4 border-black bg-[rgb(255,105,180)]/20 p-4 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-[rgb(255,105,180)]" />
              <div className="text-sm text-gray-600 uppercase">Test Plans</div>
            </div>
            <div className="text-5xl font-bold">{stats.totalPlans}</div>
          </div>

          <div className="border-4 border-black bg-[rgb(255,255,0)]/20 p-4 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-[rgb(255,255,0)]" />
              <div className="text-sm text-gray-600 uppercase">Test Runs</div>
            </div>
            <div className="text-5xl font-bold">{stats.totalRuns}</div>
          </div>

          <div className="border-4 border-black bg-white p-4 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-[rgb(0,191,255)]" />
              <div className="text-sm text-gray-600 uppercase">Overall Pass Rate</div>
            </div>
            <div className="text-5xl font-bold">{stats.passRate.toFixed(1)}%</div>
          </div>
        </div>
      </NeoCard>

      <NeoCard>
        <h2 className="text-2xl font-bold uppercase mb-4">Test Results Trends</h2>
        <p className="text-sm text-gray-600 mb-6">
          Distribution of test results over the last {period} days
        </p>

        {trends.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No data available for selected period</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {passTrend && (
              <div className="border-4 border-black bg-[rgb(57,255,20)]/10 p-4 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[rgb(57,255,20)] border-2 border-black"></div>
                    <span className="text-lg font-bold uppercase">Passed</span>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">{passTrend._count}</div>
                    <div className="text-sm text-gray-600">
                      {maxTrendCount > 0 ? Math.round((passTrend._count / maxTrendCount) * 100) : 0}%
                    </div>
                  </div>
                </div>
                {passTrend._count > (failTrend?._count || 0) && <TrendingUp className="w-5 h-5 text-[rgb(57,255,20)] inline ml-2" />}
              </div>
            )}

            {failTrend && (
              <div className="border-4 border-black bg-[rgb(239,68,68)]/10 p-4 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[rgb(239,68,68)] border-2 border-black"></div>
                    <span className="text-lg font-bold uppercase">Failed</span>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">{failTrend._count}</div>
                    <div className="text-sm text-gray-600">
                      {maxTrendCount > 0 ? Math.round((failTrend._count / maxTrendCount) * 100) : 0}%
                    </div>
                  </div>
                </div>
                {failTrend._count > (passTrend?._count || 0) && <TrendingDown className="w-5 h-5 text-[rgb(239,68,68)] inline ml-2" />}
              </div>
            )}

            {skipTrend && (
              <div className="border-4 border-black bg-gray-300 p-4 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 border-2 border-black"></div>
                    <span className="text-lg font-bold uppercase">Skipped</span>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">{skipTrend._count}</div>
                    <div className="text-sm text-gray-600">
                      {maxTrendCount > 0 ? Math.round((skipTrend._count / maxTrendCount) * 100) : 0}%
                    </div>
                  </div>
                </div>
                <FileText className="w-5 h-5 text-gray-500 inline ml-2" />
              </div>
            )}
          </div>
        )}
      </NeoCard>

      <NeoCard>
        <h2 className="text-2xl font-bold uppercase mb-4">Recent Activity Summary</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 border-2 border-black bg-gray-50">
            <Calendar className="w-8 h-8 text-gray-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold uppercase mb-1">Test Results Breakdown</h3>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-sm text-gray-600 uppercase">Passed</div>
                  <div className="text-4xl font-bold text-[rgb(57,255,20)]">{stats.results.PASS || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 uppercase">Failed</div>
                  <div className="text-4xl font-bold text-[rgb(239,68,68)]">{stats.results.FAIL || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 uppercase">Skipped</div>
                  <div className="text-4xl font-bold text-gray-700">{stats.results.SKIP || 0}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 border-2 border-black bg-gray-50">
            <Activity className="w-8 h-8 text-[rgb(0,191,255)] flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold uppercase mb-1">Pass Rate Analysis</h3>
              <div className="mt-2">
                <p className="text-3xl font-bold mb-1">{stats.passRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">
                  {stats.passRate >= 70 && 'Excellent! Your tests are consistently passing.'}
                  {stats.passRate >= 50 && stats.passRate < 70 && 'Good performance. Room for improvement.'}
                  {stats.passRate >= 30 && stats.passRate < 50 && 'Moderate. Consider reviewing failed tests.'}
                  {stats.passRate < 30 && 'Needs attention. Focus on quality assurance.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </NeoCard>
    </div>
  );
}
