'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { CheckCircle, XCircle, SkipForward, Eye } from 'lucide-react';

interface TestCase {
  id: string;
  title: string;
  description: string;
  priority: string;
  custom_id: string | null;
}

interface TestResult {
  id: string;
  status: string;
  notes: string;
  actualResult: string;
  testCase: TestCase;
}

interface PublicTestRun {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  testPlan: { id: string; name: string; description: string };
  results: TestResult[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function PublicTestRunPage() {
  const params = useParams();
  const runId = params.id as string;

  const [testRun, setTestRun] = useState<PublicTestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!runId) return;
    fetch(`${API_URL}/testruns/public/${runId}`)
      .then(res => {
        if (!res.ok) { setNotFound(true); return null; }
        return res.json();
      })
      .then(data => { if (data) setTestRun(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [runId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'bg-[rgb(134,239,172)]';
      case 'FAIL': return 'bg-[rgb(252,165,165)]';
      default:     return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FAIL': return <XCircle className="w-5 h-5 text-red-500" />;
      default:     return <SkipForward className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl font-bold uppercase">Loading...</div>
      </div>
    );
  }

  if (notFound || !testRun) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
        <NeoCard className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold uppercase mb-4">Not Found</h2>
          <p className="text-gray-600">
            This test run is not available. It may have been made private or the link is incorrect.
          </p>
        </NeoCard>
      </div>
    );
  }

  const passed  = testRun.results.filter(r => r.status === 'PASS').length;
  const failed  = testRun.results.filter(r => r.status === 'FAIL').length;
  const skipped = testRun.results.filter(r => r.status === 'SKIP').length;
  const total   = testRun.results.length;

  const passedPercent  = total > 0 ? Math.round((passed  / total) * 100) : 0;
  const failedPercent  = total > 0 ? Math.round((failed  / total) * 100) : 0;
  const skippedPercent = total > 0 ? Math.round((skipped / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Read-only banner */}
        <div className="flex items-center gap-3 border-2 border-black bg-[rgb(253,224,71)] px-5 py-3 font-bold text-sm uppercase">
          <Eye className="w-4 h-4 flex-shrink-0" />
          Read-only shared view — you are viewing this without logging in
        </div>

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold uppercase">{testRun.name}</h1>
          <p className="text-gray-600 mt-1">Test Plan: {testRun.testPlan?.name}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1 text-xs font-bold border-2 border-black uppercase ${testRun.status === 'COMPLETED' ? 'bg-[rgb(134,239,172)]' : 'bg-[rgb(253,224,71)]'}`}>
              {testRun.status}
            </span>
            <span className="text-sm text-gray-500">
              Started {new Date(testRun.startedAt).toLocaleDateString()}
              {testRun.completedAt && ` · Completed ${new Date(testRun.completedAt).toLocaleDateString()}`}
            </span>
          </div>
        </div>

        {/* Stats */}
        <NeoCard>
          <h2 className="text-2xl font-bold uppercase mb-4">Run Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-4 border-black bg-white p-4">
              <div className="text-sm text-gray-600 uppercase mb-1">Total</div>
              <div className="text-4xl font-bold">{total}</div>
            </div>
            <div className="border-4 border-black bg-[rgb(134,239,172)] p-4">
              <div className="text-sm text-gray-600 uppercase mb-1">Passed</div>
              <div className="text-3xl font-bold">{passed}</div>
              <div className="text-2xl font-bold mt-1">{passedPercent}%</div>
            </div>
            <div className="border-4 border-black bg-[rgb(252,165,165)] p-4">
              <div className="text-sm text-gray-600 uppercase mb-1">Failed</div>
              <div className="text-3xl font-bold">{failed}</div>
              <div className="text-2xl font-bold mt-1">{failedPercent}%</div>
            </div>
            <div className="border-4 border-black bg-gray-300 p-4">
              <div className="text-sm text-gray-600 uppercase mb-1">Skipped</div>
              <div className="text-3xl font-bold">{skipped}</div>
              <div className="text-2xl font-bold mt-1">{skippedPercent}%</div>
            </div>
          </div>

          {total > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="relative">
                  <svg width="160" height="160" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="transparent" stroke="black" strokeWidth="2" />
                    <circle cx="100" cy="100" r="80" fill="transparent" stroke="rgb(134,239,172)" strokeWidth="40"
                      strokeDasharray={`${passedPercent * 5.02} 500`} transform="rotate(-90 100 100)" />
                    <circle cx="100" cy="100" r="80" fill="transparent" stroke="rgb(252,165,165)" strokeWidth="40"
                      strokeDasharray={`${failedPercent * 5.02} 500`} strokeDashoffset={`-${passedPercent * 5.02}`} transform="rotate(-90 100 100)" />
                    <circle cx="100" cy="100" r="80" fill="transparent" stroke="rgb(156,163,175)" strokeWidth="40"
                      strokeDasharray={`${skippedPercent * 5.02} 500`} strokeDashoffset={`-${(passedPercent + failedPercent) * 5.02}`} transform="rotate(-90 100 100)" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-[rgb(134,239,172)] border-2 border-black" />
                    <span className="font-bold uppercase">Passed ({passedPercent}%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-[rgb(252,165,165)] border-2 border-black" />
                    <span className="font-bold uppercase">Failed ({failedPercent}%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-300 border-2 border-black" />
                    <span className="font-bold uppercase">Skipped ({skippedPercent}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </NeoCard>

        {/* Results list */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold uppercase">Test Results</h2>
          {testRun.results.map(result => (
            <NeoCard key={result.id}>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {getStatusIcon(result.status)}
                    <span className={`px-3 py-1 text-xs font-bold border-2 border-black uppercase ${getStatusColor(result.status)}`}>
                      {result.status}
                    </span>
                    <span className="px-2 py-1 text-xs font-bold border-2 border-black uppercase bg-blue-200">
                      {result.testCase.priority}
                    </span>
                    {result.testCase.custom_id && (
                      <span className="px-2 py-0.5 text-xs font-bold border-2 border-black bg-[rgb(253,224,71)] font-mono">
                        {result.testCase.custom_id}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold uppercase mb-1">{result.testCase.title}</h3>
                  {result.testCase.description && (
                    <p className="text-sm text-gray-600 mb-2">{result.testCase.description}</p>
                  )}
                  {result.notes && (
                    <div className="mt-2 p-3 bg-gray-50 border-2 border-black">
                      <div className="text-xs font-bold uppercase text-gray-500 mb-1">Notes</div>
                      <p className="text-sm">{result.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </NeoCard>
          ))}
        </div>

        <div className="text-center text-sm text-gray-400 py-4 border-t-2 border-black">
          Shared via Test Management Tool
        </div>
      </div>
    </div>
  );
}
