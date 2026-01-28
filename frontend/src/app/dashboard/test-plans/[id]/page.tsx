'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { toast } from 'sonner';
import { ArrowLeft, Save, PlayCircle, Clock, CheckSquare, Square, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';

interface TestCase {
  id: string;
  title: string;
  suite: {
    id: string;
    name: string;
  };
  status: string;
  priority: string;
}

interface GroupedTestCases {
  [suiteId: string]: {
    suiteName: string;
    testCases: TestCase[];
  };
}

interface TestRun {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

interface TestPlan {
  id: string;
  name: string;
  description: string;
  testCaseIds: string[];
  updatedAt: string;
  assignments: any[];
  runs: TestRun[];
}

export default function TestPlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [testCasePage, setTestCasePage] = useState(1);
  const [totalTestCases, setTotalTestCases] = useState(0);
  const [totalTestCasesPages, setTotalTestCasesPages] = useState(1);
  const [fetchingTestCases, setFetchingTestCases] = useState(false);
  const testCaseLimit = 20;

  useEffect(() => {
    if (planId) {
      fetchTestPlan();
      fetchTestCases();
    }
  }, [planId, testCasePage]);

  const fetchTestPlan = async () => {
    try {
      const data = await api.get(`/testplans/${planId}`);
      setTestPlan(data);
      const testCaseIds = Array.isArray(data.testCaseIds) ? data.testCaseIds : [];
      setSelectedTestCases(testCaseIds);
    } catch (error) {
      toast.error('Failed to fetch test plan');
    } finally {
      setLoading(false);
    }
  };

  const fetchTestCases = async () => {
    try {
      setFetchingTestCases(true);
      const data = await api.get(`/testcases?page=${testCasePage}&limit=${testCaseLimit}`);
      setAllTestCases(data.data || []);
      setTotalTestCases(data.pagination?.total || 0);
      setTotalTestCasesPages(data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to fetch test cases');
    } finally {
      setFetchingTestCases(false);
    }
  };

  const toggleTestCase = (testCaseId: string) => {
    setSelectedTestCases(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.includes(testCaseId)
        ? current.filter(id => id !== testCaseId)
        : [...current, testCaseId];
    });
  };
 
  const toggleSuiteSelection = (suiteId: string) => {
    const suiteTestCases = groupedTestCases[suiteId]?.testCases || [];
    const suiteTestCaseIds = suiteTestCases.map(tc => tc.id);
    const currentSelected = Array.isArray(selectedTestCases) ? selectedTestCases : [];
    const allSuiteSelected = suiteTestCases.every(tc => currentSelected.includes(tc.id));
 
    if (allSuiteSelected) {
      setSelectedTestCases(prev => {
        const current = Array.isArray(prev) ? prev : [];
        return current.filter(id => !suiteTestCaseIds.includes(id));
      });
    } else {
      setSelectedTestCases(prev => {
        const current = Array.isArray(prev) ? prev : [];
        const newSelected = [...current];
        suiteTestCaseIds.forEach(testCaseId => {
          if (!newSelected.includes(testCaseId)) {
            newSelected.push(testCaseId);
          }
        });
        return newSelected;
      });
    }
  };

  const groupedTestCases: GroupedTestCases = allTestCases.reduce((acc, tc) => {
    if (!acc[tc.suite.id]) {
      acc[tc.suite.id] = {
        suiteName: tc.suite.name,
        testCases: []
      };
    }
    acc[tc.suite.id].testCases.push(tc);
    return acc;
  }, {} as GroupedTestCases);

  const handleUpdate = async () => {
    if (!testPlan || !testPlan.name.trim()) {
      toast.error('Please enter a test plan name');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/testplans/${planId}`, {
        name: testPlan.name,
        description: testPlan.description,
        testCaseIds: selectedTestCases
      });
      toast.success('Test plan updated successfully');
      fetchTestPlan();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update test plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;

    try {
      await api.delete(`/testplans/${deleteModal.id}`);
      toast.success('Test plan deleted successfully');
      setDeleteModal(null);
      router.push('/dashboard/test-plans');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete test plan');
    }
  };

  const runTestPlan = async () => {
    if (!testPlan || selectedTestCases.length === 0) {
      toast.error('Please add test cases to the plan first');
      return;
    }

    try {
      const data = await api.post('/testruns', {
        testPlanId: planId,
        name: `${testPlan.name} - ${new Date().toLocaleDateString()}`
      });
      toast.success('Test run started successfully');
      router.push(`/dashboard/test-runs/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start test run');
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

  if (!testPlan) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold uppercase mb-4">Test Plan Not Found</h2>
            <NeoButton
              variant="primary"
              onClick={() => router.push('/dashboard/test-plans')}
            >
              Back to Test Plans
            </NeoButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <NeoButton
            variant="secondary"
            onClick={() => router.push('/dashboard/test-plans')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </NeoButton>
          <div>
            <h1 className="text-4xl font-bold uppercase">{testPlan.name}</h1>
            <p className="text-gray-600">Updated: {new Date(testPlan.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <NeoButton
            variant="primary"
            onClick={runTestPlan}
            disabled={selectedTestCases.length === 0}
            className="flex items-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            Run Plan
          </NeoButton>
          <NeoButton
            variant="danger"
            onClick={() => setDeleteModal({ id: testPlan.id, name: testPlan.name })}
            className="flex items-center gap-2"
          >
            Delete
          </NeoButton>
        </div>
      </div>

      <NeoCard className="space-y-4">
        <div>
          <label className="block font-bold uppercase mb-2">Plan Name *</label>
          <input
            type="text"
            value={testPlan.name}
            onChange={(e) => setTestPlan({ ...testPlan, name: e.target.value })}
            className="w-full p-3 border-2 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Enter test plan name"
          />
        </div>

        <div>
          <label className="block font-bold uppercase mb-2">Description</label>
          <textarea
            value={testPlan.description || ''}
            onChange={(e) => setTestPlan({ ...testPlan, description: e.target.value })}
            className="w-full p-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-black min-h-[120px]"
            placeholder="Enter test plan description"
            rows={4}
          />
        </div>

        <div className="flex justify-end">
          <NeoButton
            variant="primary"
            onClick={handleUpdate}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </NeoButton>
        </div>
      </NeoCard>

      <NeoCard className="space-y-4">
        <div>
          <label className="block font-bold uppercase mb-2">
            Test Cases ({Array.isArray(selectedTestCases) ? selectedTestCases.length : 0} selected out of {totalTestCases} total)
          </label>
          
          {allTestCases.length === 0 && totalTestCases === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No test cases available</p>
              <NeoButton
                variant="secondary"
                onClick={() => router.push('/dashboard/test-suites')}
              >
                Create Test Cases
              </NeoButton>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {Object.entries(groupedTestCases).map(([suiteId, suiteData]) => {
                  const allSuiteSelected = suiteData.testCases.every(tc => 
                    selectedTestCases.includes(tc.id)
                  );
                  const someSuiteSelected = suiteData.testCases.some(tc => 
                    selectedTestCases.includes(tc.id)
                  );

                      return (
                        <div key={suiteId} className="border-2 border-black bg-white">
                          <div
                            className="p-4 cursor-pointer border-b-2 border-black bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-between gap-4"
                            onClick={() => toggleSuiteSelection(suiteId)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                {allSuiteSelected ? (
                                  <CheckSquare className="w-6 h-6 text-[rgb(57,255,20)]" />
                                ) : (
                                  <Square className="w-6 h-6" />
                                )}
                              </div>
                              <FolderOpen className="w-6 h-6 text-gray-600" />
                              <div>
                                <h3 className="text-xl font-bold uppercase">{suiteData.suiteName}</h3>
                                <p className="text-sm text-gray-600">
                                  {suiteData.testCases.filter(tc => {
                                    const current = Array.isArray(selectedTestCases) ? selectedTestCases : [];
                                    return current.includes(tc.id);
                                  }).length} / {suiteData.testCases.length} selected
                                </p>
                              </div>
                            </div>
                            <div className="px-3 py-1 border-2 border-black font-bold text-sm bg-white">
                              Select All
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            {suiteData.testCases.map((testCase) => {
                              const current = Array.isArray(selectedTestCases) ? selectedTestCases : [];
                              return (
                                <div
                                  key={testCase.id}
                                  className={`border-2 p-4 cursor-pointer transition-all ${
                                    current.includes(testCase.id)
                                      ? 'border-[rgb(57,255,20)] bg-[rgb(57,255,20)]/10'
                                      : 'border-black bg-white'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTestCase(testCase.id);
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="px-2 py-1 text-xs font-bold border-2 border-black uppercase bg-gray-200">
                                          {testCase.status}
                                        </span>
                                        <span className="px-2 py-1 text-xs font-bold border-2 border-black uppercase bg-blue-200">
                                          {testCase.priority}
                                        </span>
                                      </div>
                                      <h3 className="text-lg font-bold uppercase">{testCase.title}</h3>
                                    </div>
                                    <div className="flex-shrink-0">
                                      <div className={`w-6 h-6 border-2 flex items-center justify-center ${
                                        current.includes(testCase.id)
                                          ? 'border-black bg-[rgb(57,255,20)]'
                                          : 'border-black bg-white'
                                      }`}>
                                        {current.includes(testCase.id) && '✓'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                })}
              </div>

              {!fetchingTestCases && totalTestCasesPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4 border-t-2 border-black mt-4">
                  <NeoButton
                    variant="secondary"
                    onClick={() => setTestCasePage(p => Math.max(1, p - 1))}
                    disabled={testCasePage === 1}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </NeoButton>
                  <span className="font-bold uppercase">
                    Page {testCasePage} of {totalTestCasesPages}
                  </span>
                  <NeoButton
                    variant="secondary"
                    onClick={() => setTestCasePage(p => Math.min(totalTestCasesPages, p + 1))}
                    disabled={testCasePage === totalTestCasesPages}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </NeoButton>
                </div>
              )}
            </>
          )}
        </div>
      </NeoCard>

      {testPlan.runs && testPlan.runs.length > 0 && (
        <NeoCard>
          <h2 className="text-2xl font-bold uppercase mb-4">Recent Runs</h2>
          <div className="space-y-3">
            {testPlan.runs.map((run) => (
              <div
                key={run.id}
                className="border-2 border-black bg-white p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <PlayCircle className="w-5 h-5 text-[rgb(57,255,20)]" />
                  <div>
                    <h3 className="font-bold uppercase">{run.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(run.startedAt).toLocaleDateString()}</span>
                      <span className={`px-2 py-1 text-xs font-bold border-2 border-black uppercase ${
                        run.status === 'COMPLETED' ? 'bg-[rgb(57,255,20)]' :
                        run.status === 'RUNNING' ? 'bg-[rgb(255,255,0)]' :
                        'bg-gray-200'
                      }`}>
                        {run.status}
                      </span>
                    </div>
                  </div>
                </div>
                <NeoButton
                  variant="secondary"
                  onClick={() => router.push(`/dashboard/test-runs/${run.id}`)}
                  className="flex items-center gap-2"
                >
                  View Results
                </NeoButton>
              </div>
            ))}
          </div>
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
                  onClick={handleDelete}
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
