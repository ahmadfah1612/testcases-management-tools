'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { FolderOpen, Plus, Edit2, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface TestSuite {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
  collaborationRole?: string;
  _count: {
    testCases: number;
  };
  children?: any[];
}

export default function TestSuitesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    if (userId) {
      fetchSuites();
    } else {
      setLoading(false);
    }
  }, [userId, page]);


  const fetchSuites = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/testsuites?page=${page}&limit=${limit}`);
      setSuites(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch test suites');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/testsuites/${id}`);
      toast.success('Test suite deleted successfully');
      setDeleteModal(null);
      if (page > 1 && suites.length === 1) {
        setPage(page - 1);
      } else {
        fetchSuites();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete test suite');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold uppercase">Test Suites</h1>
        <NeoButton 
          variant="primary" 
          className="flex items-center gap-2"
          onClick={() => router.push('/dashboard/test-suites/new')}
        >
          <Plus className="w-5 h-5" />
          New Suite
        </NeoButton>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-2xl font-bold uppercase">Loading...</div>
        </div>
      ) : suites.length === 0 ? (
        <NeoCard className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold uppercase mb-2">No Test Suites Yet</h2>
          <p className="text-gray-600 mb-6">
            Create your first test suite to get started
          </p>
          <NeoButton 
            variant="primary"
            onClick={() => router.push('/dashboard/test-suites/new')}
          >
            Create Test Suite
          </NeoButton>
        </NeoCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suites.map((suite) => (
            <NeoCard 
              key={suite.id} 
              className="hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[rgb(134,239,172)] border-2 border-black cursor-pointer" onClick={() => router.push(`/dashboard/test-suites/${suite.id}`)}>
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  {!suite.isOwner && suite.collaborationRole && (
                    <span className="flex items-center gap-1 px-2 py-1 border-2 border-black bg-[rgb(147,197,253)] font-bold text-xs uppercase">
                      <Users className="w-3 h-3" />
                      Shared
                    </span>
                  )}
                  <div className="border-2 border-black px-3 py-1 font-bold text-sm">
                    {suite._count.testCases} cases
                  </div>
                  <div className="flex gap-1">
                    <NeoButton
                      variant="secondary"
                      onClick={() => router.push(`/dashboard/test-suites/${suite.id}`)}
                      className="px-2 py-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </NeoButton>
                    <NeoButton
                      variant="danger"
                      onClick={() => setDeleteModal({ id: suite.id, name: suite.name })}
                      className="px-2 py-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </NeoButton>
                  </div>
                </div>
              </div>
              <div 
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/test-suites/${suite.id}`)}
              >
                <h2 className="text-xl font-bold uppercase mb-2">{suite.name}</h2>
                {suite.description && (
                  <p className="text-gray-600 line-clamp-2">{suite.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Updated: {new Date(suite.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </NeoCard>
           ))}
         </div>
       )}

       {!loading && suites.length > 0 && totalPages > 1 && (
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
            <h2 className="text-2xl font-bold uppercase mb-4">Delete Test Suite</h2>

            <div className="space-y-4">
              <div className="border-2 border-black bg-[rgb(253,224,71)]/20 p-4">
                <p className="font-bold">
                  Are you sure you want to delete <strong>&quot;{deleteModal.name}&quot;</strong>?
                </p>
                <p className="text-sm mt-2 text-gray-600">
                  This will also delete all test cases in this suite. This action cannot be undone.
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