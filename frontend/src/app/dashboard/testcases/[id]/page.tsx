'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Edit2, Trash2, Clock, Users } from 'lucide-react';
import { CollaboratorsPanel } from '@/components/CollaboratorsPanel';

interface Step {
  step_number: number;
  action: string;
  expected_result: string;
}

interface TestCase {
  id: string;
  title: string;
  description: string;
  steps: Step[];
  expected_result: string;
  status: string;
  priority: string;
  tags: string[];
  suite: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  versions: any[];
  isOwner?: boolean;
  collaborationRole?: string;
}

export default function TestCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const caseId = params.id as string;

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTestCase();
    }
  }, [user, caseId]);

  const fetchTestCase = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/testcases/${caseId}`);
      setTestCase(data);
    } catch (error) {
      toast.error('Failed to load test case');
      router.push('/dashboard/test-suites');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/testcases/${caseId}`);
      toast.success('Test case deleted successfully');
      if (testCase) {
        router.push(`/dashboard/test-suites/${testCase.suite.id}`);
      } else {
        router.push('/dashboard/test-suites');
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

  if (!testCase) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NeoButton
              variant="secondary"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </NeoButton>
            <div>
              <h1 className="text-4xl font-bold uppercase">{testCase.title}</h1>
              <p className="text-gray-600">
                Suite: {testCase.suite.name}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {testCase.collaborationRole !== 'viewer' && (
              <NeoButton
                variant="secondary"
                onClick={() => router.push(`/dashboard/testcases/${testCase.id}/edit`)}
                className="flex items-center gap-2"
              >
                <Edit2 className="w-5 h-5" />
                Edit
              </NeoButton>
            )}
            {testCase.isOwner && (
              <NeoButton
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </NeoButton>
            )}
            {!testCase.isOwner && testCase.collaborationRole && (
              <span className="flex items-center gap-1 px-3 py-2 border-2 border-black bg-[rgb(0,191,255)] font-bold uppercase text-sm">
                <Users className="w-4 h-4" />
                Shared
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-4 py-2 font-bold border-2 border-black uppercase ${getStatusColor(testCase.status)}`}>
            {testCase.status}
          </span>
          <span className={`px-4 py-2 font-bold border-2 border-black uppercase ${getPriorityColor(testCase.priority)}`}>
            {testCase.priority}
          </span>
          {Array.isArray(testCase.tags) && testCase.tags.map((tag: string, index: number) => (
            <span
              key={index}
              className="px-4 py-2 bg-[rgb(255,105,180)] border-2 border-black font-bold text-sm uppercase"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            Created: {new Date(testCase.createdAt).toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            Updated: {new Date(testCase.updatedAt).toLocaleString()}
          </div>
        </div>

        {testCase.description && (
          <NeoCard>
            <h2 className="text-xl font-bold uppercase mb-4">Description</h2>
            <p className="text-gray-700">{testCase.description}</p>
          </NeoCard>
        )}

        <NeoCard>
          <h2 className="text-xl font-bold uppercase mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Test Steps
          </h2>
          <div className="space-y-4">
            {Array.isArray(testCase.steps) && testCase.steps.map((step: any, index: number) => (
              <NeoCard key={index} className="bg-gray-50">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[rgb(57,255,20)] border-2 border-black flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {step.step_number}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="text-sm font-bold uppercase text-gray-600 mb-1">Action</div>
                      <p className="font-medium">{step.action}</p>
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase text-gray-600 mb-1">Expected Result</div>
                      <p className="font-medium">{step.expected_result}</p>
                    </div>
                  </div>
                </div>
              </NeoCard>
            ))}
          </div>
        </NeoCard>

        {testCase.expected_result && (
          <NeoCard>
            <h2 className="text-xl font-bold uppercase mb-4">Overall Expected Result</h2>
            <p className="font-medium">{testCase.expected_result}</p>
          </NeoCard>
        )}

        {testCase.versions && testCase.versions.length > 0 && (
          <NeoCard>
            <h2 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Version History
            </h2>
            <div className="space-y-2">
              {testCase.versions.map((version, index) => (
                <div key={index} className="flex items-center justify-between p-3 border-2 border-black bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="font-bold">v{version.version}</div>
                    <div className="text-sm text-gray-600">{version.changes}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(version.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </NeoCard>
        )}

        <CollaboratorsPanel
          resourceType="testcase"
          resourceId={caseId}
          isOwner={testCase.isOwner ?? true}
        />

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <NeoCard className="w-full max-w-md">
              <h2 className="text-2xl font-bold uppercase mb-4">Delete Test Case</h2>

              <div className="space-y-4">
                <div className="border-2 border-black bg-[rgb(255,255,0)]/20 p-4">
                  <p className="font-bold">
                    Are you sure you want to delete <strong>&quot;{testCase.title}&quot;</strong>?
                  </p>
                  <p className="text-sm mt-2 text-gray-600">
                    This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <NeoButton
                    variant="secondary"
                    onClick={() => setShowDeleteModal(false)}
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
    </div>
  );
}
