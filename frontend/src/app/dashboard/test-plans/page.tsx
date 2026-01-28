'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { PlayCircle, Plus, Edit2, Trash2, ListTodo, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface TestPlan {
  id: string;
  name: string;
  description: string | null;
  testCaseIds: string[];
  createdAt: string;
  updatedAt: string;
  _count: {
    runs: number;
  };
}

export default function TestPlansPage() {
  const router = useRouter();
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchTestPlans();
  }, [page]);

  const fetchTestPlans = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/testplans?page=${page}&limit=${limit}`);
      setTestPlans(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch test plans');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/testplans/${id}`);
      toast.success('Test plan deleted successfully');
      setDeleteModal(null);
      if (page > 1 && testPlans.length === 1) {
        setPage(page - 1);
      } else {
        fetchTestPlans();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete test plan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold uppercase">Test Plans</h1>
          <p className="text-gray-600">Organize and manage your test execution plans</p>
        </div>
        <NeoButton
          variant="primary"
          className="flex items-center gap-2"
          onClick={() => router.push('/dashboard/test-plans/new')}
        >
          <Plus className="w-5 h-5" />
          New Plan
        </NeoButton>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-2xl font-bold uppercase">Loading...</div>
        </div>
      ) : testPlans.length === 0 ? (
        <NeoCard className="text-center py-12">
          <ListTodo className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold uppercase mb-2">No Test Plans Yet</h2>
          <p className="text-gray-600 mb-6">
            Create your first test plan to start organizing test runs
          </p>
          <NeoButton
            variant="primary"
            onClick={() => router.push('/dashboard/test-plans/new')}
          >
            Create Test Plan
          </NeoButton>
        </NeoCard>
      ) : (
        <div className="space-y-4">
          {testPlans.map((plan) => (
            <NeoCard
              key={plan.id}
              className="hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/test-plans/${plan.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[rgb(57,255,20)] border-2 border-black">
                      <PlayCircle className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="border-2 border-black px-3 py-1 font-bold text-sm">
                        {plan.testCaseIds.length} cases
                      </span>
                      <span className="border-2 border-black px-3 py-1 font-bold text-sm bg-[rgb(0,191,255)]/20">
                        {plan._count.runs} runs
                      </span>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold uppercase mb-2">{plan.name}</h2>
                  {plan.description && (
                    <p className="text-gray-600 line-clamp-2 mb-3">{plan.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Updated: {new Date(plan.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <NeoButton
                    variant="secondary"
                    onClick={() => router.push(`/dashboard/test-plans/${plan.id}`)}
                    className="px-3 py-2"
                  >
                    <Edit2 className="w-4 h-4" />
                  </NeoButton>
                  <NeoButton
                    variant="danger"
                    onClick={() => setDeleteModal({ id: plan.id, name: plan.name })}
                    className="px-3 py-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </NeoButton>
                </div>
              </div>
            </NeoCard>
          ))}
        </div>
      )}

      {!loading && testPlans.length > 0 && totalPages > 1 && (
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

      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <NeoCard className="w-full max-w-md">
            <h2 className="text-2xl font-bold uppercase mb-4">Delete Test Plan</h2>

            <div className="space-y-4">
              <div className="border-2 border-black bg-[rgb(255,255,0)]/20 p-4">
                <p className="font-bold">
                  Are you sure you want to delete <strong>&quot;{deleteModal.name}&quot;</strong>?
                </p>
                <p className="text-sm mt-2 text-gray-600">
                  This will also delete all test runs and schedules associated with this plan. This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <NeoButton
                  variant="secondary"
                  onClick={() => setDeleteModal(null)}
                  className="flex-1"
                >
                  Cancel
                </NeoButton>
                <NeoButton
                  variant="danger"
                  onClick={() => handleDelete(deleteModal.id)}
                  className="flex-1"
                >
                  Delete
                </NeoButton>
              </div>
            </div>
          </NeoCard>
        </div>
      )}
    </div>
  );
}
