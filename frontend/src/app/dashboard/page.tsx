'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface DashboardStats {
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

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.get('/reports/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-4xl font-bold uppercase mb-8">Dashboard</h1>
        <div className="text-center py-12">
          <div className="text-2xl font-bold uppercase">Loading...</div>
        </div>
      </div>
    );
  }

  const results = stats?.results || {};

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold uppercase mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-sm font-bold uppercase text-gray-600 mb-2">Total Test Cases</div>
          <p className="text-5xl font-bold">{stats?.totalCases || 0}</p>
        </div>
        <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-sm font-bold uppercase text-gray-600 mb-2">Total Test Suites</div>
          <p className="text-5xl font-bold">{stats?.totalSuites || 0}</p>
        </div>
        <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-sm font-bold uppercase text-gray-600 mb-2">Total Test Plans</div>
          <p className="text-5xl font-bold">{stats?.totalPlans || 0}</p>
        </div>
        <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-sm font-bold uppercase text-gray-600 mb-2">Total Test Runs</div>
          <p className="text-5xl font-bold">{stats?.totalRuns || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-lg font-bold uppercase mb-4">Test Results</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold">Passed</span>
              <span className="text-3xl font-bold text-green-500">{results.PASS || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold">Failed</span>
              <span className="text-3xl font-bold text-red-500">{results.FAIL || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold">Skipped</span>
              <span className="text-3xl font-bold text-purple-500">{results.SKIP || 0}</span>
            </div>

          </div>
        </div>

        <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-lg font-bold uppercase mb-2">Pass Rate</h2>
          <div className="text-center mt-4">
            <p className="text-7xl font-bold">{Math.round(stats?.passRate || 0)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-lg font-bold uppercase mb-4">Quick Actions</h2>
          <ul className="space-y-3">
            <li 
              onClick={() => router.push('/dashboard/test-suites')}
              className="flex items-center gap-3 p-3 bg-emerald-100 border-2 border-black cursor-pointer hover:bg-emerald-200 transition font-bold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              Create Test Case
            </li>
            <li 
              onClick={() => router.push('/dashboard/test-plans/new')}
              className="flex items-center gap-3 p-3 bg-violet-100 border-2 border-black cursor-pointer hover:bg-violet-200 transition font-bold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Create Test Plan
            </li>
            <li 
              onClick={() => router.push('/dashboard/test-plans')}
              className="flex items-center gap-3 p-3 bg-amber-100 border-2 border-black cursor-pointer hover:bg-amber-200 transition font-bold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Start Test Run
            </li>
            <li 
              onClick={() => router.push('/dashboard/reports')}
              className="flex items-center gap-3 p-3 bg-indigo-100 border-2 border-black cursor-pointer hover:bg-indigo-200 transition font-bold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              View Reports
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}