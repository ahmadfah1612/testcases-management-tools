'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { toast } from 'sonner';
import { ArrowLeft, Save, CheckSquare, Square, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function NewTestPlanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTestCases, setFetchingTestCases] = useState(true);
  const [testCasePage, setTestCasePage] = useState(1);
  const [totalTestCases, setTotalTestCases] = useState(0);
  const [totalTestCasesPages, setTotalTestCasesPages] = useState(1);
  const testCaseLimit = 20;

  useEffect(() => {
    if (userId) {
      fetchTestCases();
    } else {
      setFetchingTestCases(false);
    }
  }, [userId, testCasePage]);
 
  const fetchTestCases = async () => {
    try {
      setFetchingTestCases(true);
      const data = await api.get(`/testcases?page=${testCasePage}&limit=${testCaseLimit}`);
      setTestCases(data.data || []);
      setTotalTestCases(data.pagination?.total || 0);
      setTotalTestCasesPages(data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to fetch test cases');
    } finally {
      setFetchingTestCases(false);
    }
  };

  const toggleTestCase = (testCaseId: string) => {
    setSelectedTestCases(prev =>
      prev.includes(testCaseId)
        ? prev.filter(id => id !== testCaseId)
        : [...prev, testCaseId]
    );
  };

  const toggleSuiteSelection = (suiteId: string) => {
    const suiteTestCases = groupedTestCases[suiteId]?.testCases || [];
    const suiteTestCaseIds = suiteTestCases.map(tc => tc.id);
    const allSuiteSelected = suiteTestCases.every(tc => selectedTestCases.includes(tc.id));
 
    if (allSuiteSelected) {
      setSelectedTestCases(prev =>
        prev.filter(id => !suiteTestCaseIds.includes(id))
      );
    } else {
      setSelectedTestCases(prev => {
        const newSelected = [...prev];
        suiteTestCaseIds.forEach(testCaseId => {
          if (!newSelected.includes(testCaseId)) {
            newSelected.push(testCaseId);
          }
        });
        return newSelected;
      });
    }
  };

  const groupedTestCases: GroupedTestCases = testCases.reduce((acc, tc) => {
    if (!acc[tc.suite.id]) {
      acc[tc.suite.id] = {
        suiteName: tc.suite.name,
        testCases: []
      };
    }
    acc[tc.suite.id].testCases.push(tc);
    return acc;
  }, {} as GroupedTestCases);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a test plan name');
      return;
    }

    if (selectedTestCases.length === 0) {
      toast.error('Please select at least one test case');
      return;
    }

    try {
      setLoading(true);
      await api.post('/testplans', {
        name,
        description,
        testCaseIds: selectedTestCases
      });
      toast.success('Test plan created successfully');
      router.push('/dashboard/test-plans');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create test plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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
          <h1 className="text-4xl font-bold uppercase">New Test Plan</h1>
          <p className="text-gray-600">Create a new test execution plan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <NeoCard className="space-y-4">
          <div>
            <label className="block font-bold uppercase mb-2">Plan Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border-2 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter test plan name"
              required
            />
          </div>

          <div>
            <label className="block font-bold uppercase mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-black min-h-[120px]"
              placeholder="Enter test plan description"
              rows={4}
            />
          </div>
        </NeoCard>

        <NeoCard className="space-y-4">
          <div>
            <label className="block font-bold uppercase mb-2">Select Test Cases *</label>
            <p className="text-sm text-gray-600 mb-4">
              Choose test cases to include in this plan ({selectedTestCases.length} selected out of {totalTestCases} total)
            </p>

            {fetchingTestCases ? (
              <div className="text-center py-8">
                <div className="text-lg font-bold uppercase">Loading test cases...</div>
              </div>
            ) : testCases.length === 0 && totalTestCases === 0 ? (
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
                                <CheckSquare className="w-6 h-6 text-[rgb(134,239,172)]" />
                              ) : (
                                <Square className="w-6 h-6" />
                              )}
                            </div>
                            <FolderOpen className="w-6 h-6 text-gray-600" />
                            <div>
                              <h3 className="text-xl font-bold uppercase">{suiteData.suiteName}</h3>
                              <p className="text-sm text-gray-600">
                                {suiteData.testCases.filter(tc => selectedTestCases.includes(tc.id)).length} / {suiteData.testCases.length} selected
                              </p>
                            </div>
                          </div>
                          <div className="px-3 py-1 border-2 border-black font-bold text-sm bg-white">
                            Select All
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          {suiteData.testCases.map((testCase) => (
                            <div
                              key={testCase.id}
                              className={`border-2 p-4 cursor-pointer transition-all ${
                                selectedTestCases.includes(testCase.id)
                                  ? 'border-[rgb(134,239,172)] bg-[rgb(134,239,172)]/10'
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
                                    selectedTestCases.includes(testCase.id)
                                      ? 'border-black bg-[rgb(134,239,172)]'
                                      : 'border-black bg-white'
                                  }`}>
                                    {selectedTestCases.includes(testCase.id) && '✓'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
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

        <div className="flex justify-end gap-4">
          <NeoButton
            variant="secondary"
            type="button"
            onClick={() => router.push('/dashboard/test-plans')}
            className="flex items-center gap-2"
          >
            Cancel
          </NeoButton>
          <NeoButton
            variant="primary"
            type="submit"
            disabled={loading || selectedTestCases.length === 0}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Test Plan'}
          </NeoButton>
        </div>
      </form>
    </div>
  );
}
