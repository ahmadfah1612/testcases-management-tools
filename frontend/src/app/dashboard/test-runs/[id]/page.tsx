'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { ArrowLeft, CheckCircle, XCircle, SkipForward, Save } from 'lucide-react';
import { toast } from 'sonner';

interface TestCase {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
}

interface TestResult {
  id: string;
  testCaseId: string;
  testCase: TestCase;
  status: string;
  actualResult: string;
  screenshots: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface TestRun {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  testPlan: {
    id: string;
    name: string;
    description: string;
  };
  results: TestResult[];
}

export default function TestRunDetailPage() {
  const router = useRouter();
  const params = useParams();
  const runId = params.id as string;
  
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (runId) {
      fetchTestRun();
    }
  }, [runId]);

  const fetchTestRun = async () => {
    try {
      const data = await api.get(`/testruns/${runId}`);
      setTestRun(data);
    } catch (error) {
      toast.error('Failed to fetch test run');
      router.push('/dashboard/test-runs');
    } finally {
      setLoading(false);
    }
  };

  const handleResultUpdate = async (result: TestResult, updates: Partial<TestResult>) => {
    try {
      setSaving(true);
      await api.post(`/testruns/${runId}/results`, {
        testCaseId: result.testCaseId,
        ...updates
      });
      toast.success('Test result updated successfully');
      fetchTestRun();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update test result');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteRun = async () => {
    if (!testRun) return;

    try {
      await api.put(`/testruns/${runId}`, { status: 'COMPLETED' });
      toast.success('Test run completed successfully');
      fetchTestRun();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete test run');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-[rgb(57,255,20)]';
      case 'FAIL':
        return 'bg-[rgb(239,68,68)]';
      case 'SKIP':
        return 'bg-gray-300';
      default:
        return 'bg-[rgb(0,191,255)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="w-5 h-5 text-[rgb(57,255,20)]" />;
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-[rgb(239,68,68)]" />;
      default:
        return <SkipForward className="w-5 h-5 text-gray-500" />;
    }
  };

  const toggleExpand = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
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

  if (!testRun) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold uppercase mb-4">Test Run Not Found</h2>
            <NeoButton
              variant="primary"
              onClick={() => router.push('/dashboard/test-runs')}
            >
              Back to Test Runs
            </NeoButton>
          </div>
        </div>
      </div>
    );
  }

  const passed = testRun.results.filter(r => r.status === 'PASS').length;
  const failed = testRun.results.filter(r => r.status === 'FAIL').length;
  const skipped = testRun.results.filter(r => r.status === 'SKIP').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <NeoButton
            variant="secondary"
            onClick={() => router.push('/dashboard/test-runs')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </NeoButton>
          <div>
            <h1 className="text-4xl font-bold uppercase">{testRun.name}</h1>
            <p className="text-gray-600">{testRun.testPlan.name}</p>
          </div>
        </div>
        {testRun.status !== 'COMPLETED' && (
          <NeoButton
            variant="primary"
            onClick={handleCompleteRun}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Complete Run
          </NeoButton>
        )}
      </div>

      <NeoCard>
        <h2 className="text-2xl font-bold uppercase mb-4">Run Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border-2 border-black bg-white p-4">
            <div className="text-sm text-gray-600 uppercase">Total</div>
            <div className="text-3xl font-bold">{testRun.results.length}</div>
          </div>
          <div className="border-2 border-black bg-[rgb(57,255,20)]/20 p-4">
            <div className="text-sm text-gray-600 uppercase">Passed</div>
            <div className="text-3xl font-bold text-[rgb(57,255,20)]">{passed}</div>
          </div>
          <div className="border-2 border-black bg-[rgb(239,68,68)]/20 p-4">
            <div className="text-sm text-gray-600 uppercase">Failed</div>
            <div className="text-3xl font-bold text-[rgb(239,68,68)]">{failed}</div>
          </div>
          <div className="border-2 border-black bg-gray-200 p-4">
            <div className="text-sm text-gray-600 uppercase">Skipped</div>
            <div className="text-3xl font-bold">{skipped}</div>
          </div>
        </div>
      </NeoCard>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold uppercase">Test Results</h2>
        {testRun.results.map((result) => (
          <NeoCard key={result.id} className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
            <div
              className="flex items-start justify-between gap-4 cursor-pointer p-4"
              onClick={() => toggleExpand(result.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(result.status)}
                  <span className={`px-3 py-1 text-xs font-bold border-2 border-black uppercase ${getStatusColor(result.status)}`}>
                    {result.status}
                  </span>
                  <span className="px-2 py-1 text-xs font-bold border-2 border-black uppercase bg-blue-200">
                    {result.testCase.priority}
                  </span>
                </div>
                <h3 className="text-xl font-bold uppercase mb-1">{result.testCase.title}</h3>
                <p className="text-sm text-gray-600">{result.testCase.description}</p>
              </div>
              <div className="flex-shrink-0">
                <div className={`w-6 h-6 border-2 border-black flex items-center justify-center bg-white transition-all ${
                  expandedResults.has(result.id) ? 'rotate-90' : ''
                }`}>
                  ▶
                </div>
              </div>
            </div>

            {expandedResults.has(result.id) && (
              <div className="border-t-2 border-black p-4 bg-gray-50">
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold uppercase mb-2 text-sm">Status</label>
                    <div className="flex gap-2 flex-wrap">
                      {['PASS', 'FAIL', 'SKIP'].map((status) => (
                        <NeoButton
                          key={status}
                          variant={result.status === status ? 'primary' : 'secondary'}
                          onClick={() => handleResultUpdate(result, { status })}
                          className="px-4 py-2"
                        >
                          {status}
                        </NeoButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold uppercase mb-2 text-sm">Actual Result</label>
                    <NeoInput
                      value={result.actualResult || ''}
                      onChange={(e) => handleResultUpdate(result, { actualResult: e.target.value })}
                      placeholder="Enter actual result"
                      multiline
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase mb-2 text-sm">Notes</label>
                    <NeoInput
                      value={result.notes || ''}
                      onChange={(e) => handleResultUpdate(result, { notes: e.target.value })}
                      placeholder="Add notes about this test result"
                      multiline
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}
          </NeoCard>
        ))}
      </div>
    </div>
  );
}
