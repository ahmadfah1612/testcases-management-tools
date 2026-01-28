'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { toast } from 'sonner';
import { Plus, FileText, Edit2, Trash2, Clock, FolderOpen } from 'lucide-react';

interface TestCase {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tags: string[];
  suite: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function TestCasesPage() {
  const router = useRouter();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    fetchTestCases();
  }, [page, filter]);

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);
      
      const data = await api.get(`/testcases?${params.toString()}`);
      setTestCases(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to load test cases');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test case?')) return;
    
    try {
      await api.delete(`/testcases/${id}`);
      toast.success('Test case deleted successfully');
      if (page > 1 && testCases.length === 1) {
        setPage(page - 1);
      } else {
        fetchTestCases();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete test case');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'DRAFT': 'bg-gray-200',
      'READY': 'bg-[rgb(57,255,20)]',
      'REVIEW': 'bg-[rgb(255,255,0)]',
      'APPROVED': 'bg-[rgb(0,191,255)]'
    };
    return colors[status] || 'bg-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-gray-200',
      'MEDIUM': 'bg-[rgb(0,191,255)]',
      'HIGH': 'bg-[rgb(255,105,180)]',
      'CRITICAL': 'bg-[rgb(239,68,68)]'
    };
    return colors[priority] || 'bg-gray-200';
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
            <h1 className="text-4xl font-bold uppercase">Test Cases</h1>
            <p className="text-gray-600">Manage your test cases</p>
          </div>
          <NeoButton
            variant="primary"
            onClick={() => router.push('/dashboard/testcases/new')}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Test Case
          </NeoButton>
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
                <option value="DRAFT">Draft</option>
                <option value="READY">Ready</option>
                <option value="REVIEW">Review</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
            <div>
              <label className="block font-bold uppercase mb-2 text-sm">Filter by Priority</label>
              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="p-2 border-2 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">All Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
        </NeoCard>

        {testCases.length === 0 ? (
          <NeoCard>
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-bold uppercase mb-2">No test cases found</h2>
              <p className="text-gray-600 mb-4">Create your first test case by selecting a test suite</p>
              <NeoButton
                variant="primary"
                onClick={() => router.push('/dashboard/test-suites')}
                className="inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Go to Test Suites
              </NeoButton>
            </div>
          </NeoCard>
        ) : (
          <div className="grid gap-4">
            {testCases.map((testCase) => (
              <NeoCard key={testCase.id} className="hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-3 py-1 text-xs font-bold border-2 border-black uppercase ${getStatusColor(testCase.status)}`}>
                        {testCase.status}
                      </span>
                      <span className={`px-3 py-1 text-xs font-bold border-2 border-black uppercase ${getPriorityColor(testCase.priority)}`}>
                        {testCase.priority}
                      </span>
                      {Array.isArray(testCase.tags) && testCase.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-[rgb(255,105,180)] border-2 border-black text-xs font-bold uppercase"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-xl font-bold uppercase mb-2">{testCase.title}</h3>
                    {testCase.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{testCase.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        <span className="font-bold">{testCase.suite.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(testCase.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <NeoButton
                      variant="secondary"
                      onClick={() => router.push(`/dashboard/testcases/${testCase.id}`)}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      View
                    </NeoButton>
                    <NeoButton
                      variant="secondary"
                      onClick={() => router.push(`/dashboard/testcases/${testCase.id}/edit`)}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </NeoButton>
                    <NeoButton
                      variant="danger"
                      onClick={() => handleDelete(testCase.id)}
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

         {!loading && testCases.length > 0 && totalPages > 1 && (
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
