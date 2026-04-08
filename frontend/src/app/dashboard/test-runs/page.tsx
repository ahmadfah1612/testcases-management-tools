'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { PlayCircle, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface TestRun {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  testPlan: { id: string; name: string; description: string };
  _count: { results: number };
  isOwner?: boolean;
  collaborationRole?: string;
}

export default function TestRunsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ status: '' });
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    if (user) {
      fetchTestRuns();
    }
  }, [user, page, filter]);

  const fetchTestRuns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (filter.status) params.append('status', filter.status);

      const data = await api.get(`/testruns?${params.toString()}`);
      setTestRuns(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to load test runs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test run?')) return;

    try {
      await api.delete(`/testruns/${id}`);
      toast.success('Test run deleted successfully');
      if (page > 1 && testRuns.length === 1) {
        setPage(page - 1);
      } else {
        fetchTestRuns();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete test run');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-6 h-6 text-[rgb(57,255,20)]" />;
      case 'FAILED':
        return <XCircle className="w-6 h-6 text-[rgb(239,68,68)]" />;
      case 'RUNNING':
        return <PlayCircle className="w-6 h-6 text-[rgb(255,255,0)]" />;
      default:
        return <AlertCircle className="w-6 h-6 text-[rgb(0,191,255)]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-[rgb(57,255,20)]';
      case 'FAILED':
        return 'bg-[rgb(239,68,68)]';
      case 'RUNNING':
        return 'bg-[rgb(255,255,0)]';
      default:
        return 'bg-[rgb(0,191,255)]';
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold uppercase">Test Runs</h1>
            <p className="text-gray-600">Manage and execute test runs</p>
          </div>
        </div>

        <NeoCard>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block font-bold uppercase mb-2 text-sm">Filter by Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="p-2 border-2 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">All Status</option>
                <option value="RUNNING">Running</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>
        </NeoCard>

        {testRuns.length === 0 ? (
          <NeoCard>
            <div className="text-center py-12">
              <PlayCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-bold uppercase mb-2">No test runs found</h2>
              <p className="text-gray-600 mb-4">
                {filter.status ? 'Try changing the filter or ' : ''}
                Create a test plan and run it to start executing test cases
              </p>
              <NeoButton
                variant="primary"
                onClick={() => router.push('/dashboard/test-plans')}
                className="inline-flex items-center gap-2"
              >
                <PlayCircle className="w-5 h-5" />
                Go to Test Plans
              </NeoButton>
            </div>
          </NeoCard>
        ) : (
          <div className="space-y-4">
            {testRuns.map((run) => (
              <NeoCard
                key={run.id}
                className="hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/test-runs/${run.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusIcon(run.status)}
                      <span className={`px-3 py-1 text-xs font-bold border-2 border-black uppercase ${getStatusColor(run.status)}`}>
                        {run.status}
                      </span>
                      <span className="border-2 border-black px-3 py-1 font-bold text-sm">
                        {run._count.results} results
                      </span>
                      {!run.isOwner && run.collaborationRole && (
                        <span className="flex items-center gap-1 px-2 py-1 border-2 border-black bg-[rgb(0,191,255)] text-xs font-bold uppercase">
                          <Users className="w-3 h-3" />
                          Shared
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold uppercase mb-2">{run.name}</h3>
                    <p className="text-gray-600 mb-2">{run.testPlan.name}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Started: {new Date(run.startedAt).toLocaleString()}</span>
                      </div>
                      {run.completedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Completed: {new Date(run.completedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <NeoButton
                      variant="danger"
                      onClick={() => handleDelete(run.id)}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </NeoButton>
                  </div>
                </div>
              </NeoCard>
            ))}
          </div>
        )}

        {!loading && testRuns.length > 0 && totalPages > 1 && (
          <NeoCard className="flex items-center justify-center gap-4 py-4">
            <NeoButton
              variant="secondary"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-2"
            >
              Previous
            </NeoButton>
            <span className="font-bold uppercase">
              Page {page} of {totalPages}
            </span>
            <span className="text-sm text-gray-600">
              ({total} total)
            </span>
            <NeoButton
              variant="secondary"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-2"
            >
              Next
            </NeoButton>
          </NeoCard>
        )}
      </div>
    </div>
  );
}
