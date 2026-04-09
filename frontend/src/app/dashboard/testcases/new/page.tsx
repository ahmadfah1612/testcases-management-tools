'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { ArrowLeft, FolderOpen, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface TestSuite {
  id: string;
  name: string;
  description: string | null;
  _count: {
    testCases: number;
  };
}

export default function NewTestCasePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSuites();
    }
  }, [user]);

  const fetchSuites = async () => {
    try {
      setLoading(true);
      const data = await api.get('/testsuites');
      setSuites(data.data || data || []);
    } catch (error) {
      toast.error('Failed to fetch test suites');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <NeoButton
          variant="secondary"
          onClick={() => router.push('/dashboard/testcases')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </NeoButton>
        <div>
          <h1 className="text-4xl font-bold uppercase">New Test Case</h1>
          <p className="text-gray-600">Select a test suite to create a test case</p>
        </div>
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
            You need to create a test suite first before creating test cases
          </p>
          <NeoButton
            variant="primary"
            onClick={() => router.push('/dashboard/test-suites/new')}
          >
            Create Test Suite
          </NeoButton>
        </NeoCard>
      ) : (
        <NeoCard>
          <h2 className="text-2xl font-bold uppercase mb-4">Select Test Suite</h2>
          <p className="text-gray-600 mb-6">
            Choose which test suite you want to add this test case to
          </p>
          <div className="space-y-3">
            {suites.map((suite) => (
              <div
                key={suite.id}
                className="border-2 border-black bg-white p-4 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                onClick={() => router.push(`/dashboard/test-suites/${suite.id}/testcases/new`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[rgb(134,239,172)] border-2 border-black">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold uppercase mb-1">{suite.name}</h3>
                      {suite.description && (
                        <p className="text-sm text-gray-600 line-clamp-1">{suite.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {suite._count?.testCases || 0} test cases
                        </span>
                      </div>
                    </div>
                  </div>
                  <NeoButton
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Create Test Case
                  </NeoButton>
                </div>
              </div>
            ))}
          </div>
        </NeoCard>
      )}
    </div>
  );
}
