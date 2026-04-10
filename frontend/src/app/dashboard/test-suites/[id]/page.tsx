'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { toast } from 'sonner';
import { ArrowLeft, FolderOpen, FileText, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Users, Download } from 'lucide-react';
import { CollaboratorsPanel } from '@/components/CollaboratorsPanel';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface TestCase {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  custom_id: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TestSuite {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
  collaborationRole?: string;
  _count: {
    testCases: number;
  };
  children: TestSuite[];
}

export default function TestSuiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const suiteId = params.id as string;

  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    code: ''
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [userId, suiteId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [suiteData, casesData] = await Promise.all([
        api.get(`/testsuites/${suiteId}`),
        api.get(`/testcases?suiteId=${suiteId}`)
      ]);
      setSuite(suiteData);
      setTestCases(Array.isArray(casesData) ? casesData : casesData.data || []);
      setEditForm({
        name: suiteData.name,
        description: suiteData.description || '',
        code: suiteData.code || ''
      });
    } catch (error) {
      toast.error('Failed to load test suite');
      router.push('/dashboard/test-suites');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.put(`/testsuites/${suiteId}`, {
        name: editForm.name,
        description: editForm.description || null,
        code: editForm.code.toUpperCase().replace(/[^A-Z0-9]/g, '') || null
      });
      toast.success('Test suite updated successfully');
      setShowEditModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update test suite');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/testsuites/${suiteId}`);
      toast.success('Test suite deleted successfully');
      router.push('/dashboard/test-suites');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete test suite');
    }
  };

  const handleDeleteTestCase = async (caseId: string) => {
    if (!confirm('Are you sure you want to delete this test case?')) {
      return;
    }

    try {
      await api.delete(`/testcases/${caseId}`);
      toast.success('Test case deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete test case');
    }
  };

  const toggleChild = (childId: string) => {
    setExpandedChildren(prev => {
      const newSet = new Set(prev);
      if (newSet.has(childId)) {
        newSet.delete(childId);
      } else {
        newSet.add(childId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (!exportOpen) return;
    const handler = () => setExportOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [exportOpen]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    setExporting(true);
    setExportOpen(false);
    try {
      const data = await api.get(`/testcases/export?suiteId=${suiteId}`);
      const rows: any[] = data.data || [];
      if (rows.length === 0) {
        toast.info('No test cases to export');
        return;
      }
      const safeName = (suite?.name || 'suite').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      if (format === 'csv') {
        const csv = Papa.unparse(rows);
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${safeName}-testcases.csv`);
      } else {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');
        XLSX.writeFile(wb, `${safeName}-testcases.xlsx`);
      }
      toast.success(`Exported ${rows.length} test cases`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'DRAFT': 'bg-gray-200',
      'READY': 'bg-[rgb(134,239,172)]',
      'REVIEW': 'bg-[rgb(253,224,71)]',
      'APPROVED': 'bg-[rgb(147,197,253)]'
    };
    return colors[status] || 'bg-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-gray-200',
      'MEDIUM': 'bg-[rgb(147,197,253)]',
      'HIGH': 'bg-[rgb(249,168,212)]',
      'CRITICAL': 'bg-[rgb(252,165,165)]'
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

  if (!suite) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
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
              <h1 className="text-4xl font-bold uppercase">{suite.name}</h1>
              <p className="text-gray-600">
                {suite.description || 'No description provided'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {/* Export dropdown */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <NeoButton
                variant="secondary"
                onClick={() => setExportOpen(o => !o)}
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-3 h-3" />
              </NeoButton>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[180px]">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-4 py-2 font-bold uppercase hover:bg-gray-100 border-b-2 border-black text-sm"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-4 py-2 font-bold uppercase hover:bg-gray-100 text-sm"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>

            {suite.collaborationRole !== 'viewer' && (
              <NeoButton
                variant="secondary"
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2"
              >
                <Edit2 className="w-5 h-5" />
                Edit
              </NeoButton>
            )}
            {suite.isOwner && (
              <NeoButton
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </NeoButton>
            )}
            {!suite.isOwner && suite.collaborationRole && (
              <span className="flex items-center gap-1 px-3 py-2 border-2 border-black bg-[rgb(147,197,253)] font-bold uppercase text-sm">
                <Users className="w-4 h-4" />
                Shared
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <NeoCard>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold uppercase flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Test Cases
                </h2>
                <NeoButton
                  variant="primary"
                  onClick={() => router.push(`/dashboard/test-suites/${suiteId}/testcases/new`)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Test Case
                </NeoButton>
              </div>

              {testCases.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-bold uppercase mb-2">No Test Cases Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Add test cases to this suite to get started
                  </p>
                  <NeoButton
                    variant="primary"
                    onClick={() => router.push(`/dashboard/test-suites/${suiteId}/testcases/new`)}
                  >
                    Create Test Case
                  </NeoButton>
                </div>
              ) : (
                <div className="space-y-4">
                  {testCases.map((testCase) => (
                    <NeoCard
                      key={testCase.id}
                      className="hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                      onClick={() => router.push(`/dashboard/testcases/${testCase.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            {testCase.custom_id && (
                              <span className="px-2 py-0.5 text-xs font-bold border-2 border-black bg-[rgb(253,224,71)] font-mono">
                                {testCase.custom_id}
                              </span>
                            )}
                            <h3 className="text-lg font-bold uppercase">{testCase.title}</h3>
                            <span className={`px-3 py-1 text-xs font-bold border-2 border-black ${getStatusColor(testCase.status)}`}>
                              {testCase.status}
                            </span>
                            <span className={`px-3 py-1 text-xs font-bold border-2 border-black ${getPriorityColor(testCase.priority)}`}>
                              {testCase.priority}
                            </span>
                          </div>
                          {testCase.description && (
                            <p className="text-gray-600 text-sm line-clamp-2">{testCase.description}</p>
                          )}
                        </div>
                        <NeoButton
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTestCase(testCase.id);
                          }}
                          className="ml-4 px-3 py-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </NeoButton>
                      </div>
                    </NeoCard>
                  ))}
                </div>
              )}
            </NeoCard>
          </div>

          <div className="space-y-6">
            <NeoCard>
              <h2 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
                <FolderOpen className="w-6 h-6" />
                Suite Details
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold uppercase text-gray-600 mb-1">Name</div>
                  <div className="font-bold">{suite.name}</div>
                </div>
                <div>
                  <div className="text-sm font-bold uppercase text-gray-600 mb-1">Prefix Code</div>
                  {suite.code ? (
                    <span className="inline-block px-2 py-0.5 text-sm font-bold border-2 border-black bg-[rgb(253,224,71)] font-mono">
                      {suite.code}
                    </span>
                  ) : (
                    <div className="text-sm text-gray-400 italic">Not set</div>
                  )}
                </div>
                {suite.description && (
                  <div>
                    <div className="text-sm font-bold uppercase text-gray-600 mb-1">Description</div>
                    <div className="text-sm">{suite.description}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold uppercase text-gray-600 mb-1">Test Cases</div>
                  <div className="text-2xl font-bold">{suite._count.testCases}</div>
                </div>
                <div>
                  <div className="text-sm font-bold uppercase text-gray-600 mb-1">Created</div>
                  <div className="text-sm">
                    {new Date(suite.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold uppercase text-gray-600 mb-1">Last Updated</div>
                  <div className="text-sm">
                    {new Date(suite.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </NeoCard>

            <CollaboratorsPanel
              resourceType="suite"
              resourceId={suiteId}
              isOwner={suite.isOwner ?? true}
            />

            {suite.children && suite.children.length > 0 && (
              <NeoCard>
                <h2 className="text-xl font-bold uppercase mb-4">Sub-Suites</h2>
                <div className="space-y-2">
                  {suite.children.map((child) => (
                    <div key={child.id}>
                      <div
                        onClick={() => toggleChild(child.id)}
                        className="flex items-center justify-between p-3 border-2 border-black bg-white cursor-pointer hover:bg-gray-50 transition font-bold"
                      >
                        <div className="flex items-center gap-2">
                          {expandedChildren.has(child.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <FolderOpen className="w-5 h-5 text-[rgb(134,239,172)]" />
                          {child.name}
                        </div>
                        <div className="text-xs border-2 border-black px-2 py-1">
                          {child._count?.testCases || 0} cases
                        </div>
                      </div>
                      {expandedChildren.has(child.id) && (
                        <div className="ml-6 mt-2 space-y-2">
                          <div className="p-3 bg-gray-100 border border-black text-sm">
                            {child.description || 'No description'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </NeoCard>
            )}
          </div>
        </div>

        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <NeoCard className="w-full max-w-md">
              <h2 className="text-2xl font-bold uppercase mb-6">Edit Test Suite</h2>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase mb-2">Suite Name</label>
                  <NeoInput
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-2">Prefix Code</label>
                  <NeoInput
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) })}
                    placeholder="e.g., LOGIN, API"
                    className="w-full"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    New test cases will use this prefix (e.g., <strong>{editForm.code || 'PREFIX'}-001</strong>).
                  </p>
                </div>

                <div>
                  <label className="block font-bold uppercase mb-2">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full p-4 border-2 border-black bg-white focus:border-3 focus:outline-none focus:border-[rgb(147,197,253)] transition-all min-h-[120px]"
                    rows={4}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <NeoButton
                    type="button"
                    variant="secondary"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </NeoButton>
                  <NeoButton type="submit" variant="primary" className="flex-1">
                    Save Changes
                  </NeoButton>
                </div>
              </form>
            </NeoCard>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <NeoCard className="w-full max-w-md">
              <h2 className="text-2xl font-bold uppercase mb-4">Delete Test Suite</h2>

              <div className="space-y-4">
                <div className="border-2 border-black bg-[rgb(253,224,71)]/20 p-4">
                  <p className="font-bold">
                    Are you sure you want to delete <strong>&quot;{suite.name}&quot;</strong>?
                  </p>
                  <p className="text-sm mt-2 text-gray-600">
                    This will also delete all {suite._count.testCases} test cases in this suite.
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
                    Delete Suite
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
