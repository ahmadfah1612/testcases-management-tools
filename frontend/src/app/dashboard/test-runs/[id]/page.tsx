'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { ArrowLeft, CheckCircle, XCircle, SkipForward, Save, Download, Users, Share2, Copy, Check } from 'lucide-react';
import { CollaboratorsPanel } from '@/components/CollaboratorsPanel';
import { toast } from 'sonner';
import { exportTestRunToPDF } from '@/lib/pdf-export';

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

interface DraftResults {
  [resultId: string]: {
    status: string;
    notes: string;
  };
}

interface TestRun {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  testPlan: { id: string; name: string; description: string };
  results: TestResult[];
  resultsCount: number;
  isPublic: boolean;
  isOwner?: boolean;
  collaborationRole?: string;
}

export default function TestRunDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const userId = user?.id;
  const runId = params.id as string;

  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [resultId: string]: boolean }>({});
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [draftResults, setDraftResults] = useState<DraftResults>({});
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsLimit] = useState(10);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [togglingShare, setTogglingShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userId && runId) {
      fetchTestRun(false);
    } else {
      setLoading(false);
    }
  }, [userId, runId, resultsPage]);

  const fetchTestRun = async (preserveDrafts: boolean = false) => {
    try {
      const resultsOffset = (resultsPage - 1) * resultsLimit;
      const data = await api.get(`/testruns/${runId}?page=${resultsPage}&limit=${resultsLimit}&resultsOffset=${resultsOffset}`);

      setTestRun(data);
      setIsPublic(data.isPublic ?? false);

      setDraftResults(prev => {
        if (preserveDrafts && Object.keys(prev).length > 0) {
          return prev;
        }

        const drafts: DraftResults = {};
        data.results.forEach((result: TestResult) => {
          drafts[result.id] = {
            status: result.status,
            notes: result.notes || ''
          };
        });
        return drafts;
      });
    } catch (error) {
      toast.error('Failed to fetch test run');
      router.push('/dashboard/test-runs');
    } finally {
      setLoading(false);
      setLoadingResults(false);
    }
  };

  const handleDraftChange = (resultId: string, field: 'status' | 'notes', value: string) => {
    setDraftResults(prev => {
      const currentDraft = prev[resultId] || {
        status: '',
        notes: ''
      };
      const newDraft = {
        ...currentDraft,
        [field]: value
      };

      return {
        ...prev,
        [resultId]: newDraft
      };
    });
  };

  const handleResultSave = async (result: TestResult) => {
    const draft = draftResults[result.id];
    if (!draft) {
      toast.error('Please make changes before saving');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, [result.id]: true }));
      const response = await api.post(`/testruns/${runId}/results`, {
        testCaseId: result.testCaseId,
        status: draft.status,
        notes: draft.notes
      });

      if (response.data) {
        setDraftResults(prev => ({
          ...prev,
          [result.id]: {
            status: response.data.status || draft.status,
            notes: response.data.notes || draft.notes
          }
        }));

        setTestRun(prev => prev ? {
          ...prev,
          results: prev.results.map(r =>
            r.id === result.id ? {
              ...r,
              status: response.data.status || draft.status,
              notes: response.data.notes || draft.notes
            } : r
          )
        } : null);
      }

      toast.success('Test result saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save test result');
    } finally {
      setSaving((prev) => ({ ...prev, [result.id]: false }));
    }
  };

  const handleCompleteRun = async () => {
    if (!testRun) return;

    try {
      await api.put(`/testruns/${runId}`, { status: 'COMPLETED' });
      toast.success('Test run completed successfully');
      fetchTestRun(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete test run');
    }
  };

  const handleToggleShare = async () => {
    try {
      setTogglingShare(true);
      const next = !isPublic;
      await api.patch(`/testruns/${runId}/share`, { isPublic: next });
      setIsPublic(next);
      toast.success(next ? 'Link sharing enabled' : 'Link sharing disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update sharing');
    } finally {
      setTogglingShare(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/share/test-runs/${runId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-[rgb(134,239,172)]';
      case 'FAIL':
        return 'bg-[rgb(252,165,165)]';
      case 'SKIP':
        return 'bg-gray-300';
      default:
        return 'bg-[rgb(147,197,253)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="w-5 h-5 text-[rgb(134,239,172)]" />;
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-[rgb(252,165,165)]" />;
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

  const totalPages = Math.ceil((testRun.resultsCount || 0) / resultsLimit);
  const passed = testRun.results.filter(r => r.status === 'PASS').length;
  const failed = testRun.results.filter(r => r.status === 'FAIL').length;
  const skipped = testRun.results.filter(r => r.status === 'SKIP').length;
  const total = passed + failed + skipped;

  const passedPercent = total > 0 ? Math.round((passed / total) * 100) : 0;
  const failedPercent = total > 0 ? Math.round((failed / total) * 100) : 0;
  const skippedPercent = total > 0 ? Math.round((skipped / total) * 100) : 0;

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
        <div className="flex items-center gap-3">
          {!testRun.isOwner && testRun.collaborationRole && (
            <span className="flex items-center gap-1 px-3 py-2 border-2 border-black bg-[rgb(147,197,253)] font-bold uppercase text-sm">
              <Users className="w-4 h-4" />
              Shared
            </span>
          )}
          {testRun.isOwner && (
            <NeoButton
              variant="secondary"
              onClick={() => setShowSharePanel(p => !p)}
              className={`flex items-center gap-2 ${isPublic ? 'bg-[rgb(134,239,172)]' : ''}`}
            >
              <Share2 className="w-4 h-4" />
              {isPublic ? 'Shared' : 'Share'}
            </NeoButton>
          )}
          <NeoButton
            variant="primary"
            onClick={() => exportTestRunToPDF(testRun)}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </NeoButton>
          {testRun.status !== 'COMPLETED' && testRun.collaborationRole !== 'viewer' && (
            <NeoButton
              variant="warning"
              onClick={handleCompleteRun}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Complete Run
            </NeoButton>
          )}
        </div>
      </div>

      {showSharePanel && testRun.isOwner && (
        <NeoCard className="border-2 border-black bg-white">
          <h3 className="text-lg font-bold uppercase mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Test Run Results
          </h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold">Public link sharing</p>
              <p className="text-sm text-gray-600">
                {isPublic
                  ? 'Anyone with the link can view these results without logging in.'
                  : 'Enable to generate a public link for sharing with external stakeholders.'}
              </p>
            </div>
            <button
              onClick={handleToggleShare}
              disabled={togglingShare}
              className={`relative inline-flex h-7 w-14 items-center rounded-none border-2 border-black transition-colors focus:outline-none disabled:opacity-50 ${isPublic ? 'bg-[rgb(134,239,172)]' : 'bg-gray-200'}`}
            >
              <span
                className={`inline-block h-5 w-5 transform border-2 border-black bg-white transition-transform ${isPublic ? 'translate-x-7' : 'translate-x-1'}`}
              />
            </button>
          </div>

          {isPublic && (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/share/test-runs/${runId}` : ''}
                className="flex-1 p-2 border-2 border-black bg-gray-50 font-mono text-sm focus:outline-none"
              />
              <NeoButton
                variant="secondary"
                onClick={handleCopyLink}
                className="flex items-center gap-2 flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </NeoButton>
            </div>
          )}
        </NeoCard>
      )}

      <NeoCard>
        <h2 className="text-2xl font-bold uppercase mb-4">Run Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border-4 border-black bg-white p-4 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow">
            <div className="text-sm text-gray-600 uppercase mb-1">Total</div>
            <div className="text-4xl font-bold">{testRun.resultsCount}</div>
          </div>
          <div className="border-4 border-black bg-[rgb(134,239,172)] p-4 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow">
            <div className="text-sm text-gray-600 uppercase mb-1">Passed</div>
            <div className="text-3xl font-bold text-black">{passed}</div>
            <div className="text-2xl font-bold text-black mt-2">{passedPercent}%</div>
          </div>
          <div className="border-4 border-black bg-[rgb(252,165,165)] p-4 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow">
            <div className="text-sm text-gray-600 uppercase mb-1">Failed</div>
            <div className="text-3xl font-bold text-black">{failed}</div>
            <div className="text-2xl font-bold text-black mt-2">{failedPercent}%</div>
          </div>
          <div className="border-4 border-black bg-gray-300 p-4 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow">
            <div className="text-sm text-gray-600 uppercase mb-1">Skipped</div>
            <div className="text-3xl font-bold text-black">{skipped}</div>
            <div className="text-2xl font-bold text-black mt-2">{skippedPercent}%</div>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold uppercase mb-4">Test Results Distribution</h3>
            <div className="flex items-center justify-center gap-8" id="test-run-distribution-chart">
              <div className="relative">
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="transparent"
                    stroke="black"
                    strokeWidth="2"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="transparent"
                    stroke="rgb(134,239,172)"
                    strokeWidth="40"
                    strokeDasharray={`${passedPercent * 5.02} 500`}
                    transform="rotate(-90 100 100)"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="transparent"
                    stroke="rgb(252,165,165)"
                    strokeWidth="40"
                    strokeDasharray={`${failedPercent * 5.02} 500`}
                    strokeDashoffset={`-${passedPercent * 5.02}`}
                    transform="rotate(-90 100 100)"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="transparent"
                    stroke="rgb(156,163,175)"
                    strokeWidth="40"
                    strokeDasharray={`${skippedPercent * 5.02} 500`}
                    strokeDashoffset={`-${(passedPercent + failedPercent) * 5.02}`}
                    transform="rotate(-90 100 100)"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-[rgb(134,239,172)] border-2 border-black"></div>
                  <span className="font-bold uppercase">Passed ({passedPercent}%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-[rgb(252,165,165)] border-2 border-black"></div>
                  <span className="font-bold uppercase">Failed ({failedPercent}%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-300 border-2 border-black"></div>
                  <span className="font-bold uppercase">Skipped ({skippedPercent}%)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </NeoCard>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold uppercase">Test Results</h2>
          {testRun.resultsCount > resultsLimit && (
            <span className="text-sm text-gray-600">
              Page {resultsPage} of {totalPages} ({testRun.resultsCount} total)
            </span>
          )}
        </div>
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
                <div className={`w-6 h-6 border-2 border-black flex items-center justify-center bg-white transition-all ${expandedResults.has(result.id) ? 'rotate-90' : ''
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
                          variant={draftResults[result.id]?.status === status ? 'primary' : 'secondary'}
                          onClick={() => handleDraftChange(result.id, 'status', status)}
                          className="px-4 py-2"
                        >
                          {status}
                        </NeoButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold uppercase mb-2 text-sm">Notes</label>
                    <textarea
                      value={draftResults[result.id]?.notes ?? ''}
                      onChange={(e) => handleDraftChange(result.id, 'notes', e.target.value)}
                      placeholder="Add notes about this test result"
                      className="w-full p-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-black min-h-[80px] font-normal text-base"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end">
                    <NeoButton
                      variant="primary"
                      onClick={() => handleResultSave(result)}
                      disabled={saving[result.id]}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving[result.id] ? 'Saving...' : 'Save'}
                    </NeoButton>
                  </div>
                </div>
              </div>
            )}
          </NeoCard>
        ))}
      </div>

      {testRun.resultsCount > resultsLimit && (
        <NeoCard className="flex items-center justify-center gap-4 py-4">
          <NeoButton
            variant="secondary"
            onClick={() => setResultsPage(p => Math.max(1, p - 1))}
            disabled={resultsPage === 1 || loadingResults}
            className="flex items-center gap-2"
          >
            Previous
          </NeoButton>
          <span className="font-bold uppercase">
            Page {resultsPage} of {totalPages}
          </span>
          <span className="text-sm text-gray-600">
            ({testRun.resultsCount} total)
          </span>
          <NeoButton
            variant="secondary"
            onClick={() => setResultsPage(p => Math.min(totalPages, p + 1))}
            disabled={resultsPage === totalPages || loadingResults}
            className="flex items-center gap-2"
          >
            Next
          </NeoButton>
        </NeoCard>
      )}

      <CollaboratorsPanel
        resourceType="testrun"
        resourceId={runId}
        isOwner={testRun.isOwner ?? true}
      />
    </div>
  );
}
