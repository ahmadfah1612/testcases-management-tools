'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { toast } from 'sonner';
import {
  Plus, FileText, Edit2, Trash2, Clock, FolderOpen,
  Upload, Download, ChevronDown, X, AlertCircle
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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

interface ImportRow {
  title: string;
  description?: string;
  suiteName: string;
  expectedResult: string;
  steps?: string;
  status?: string;
  priority?: string;
  tags?: string;
}

const CSV_TEMPLATE_HEADERS = ['title', 'description', 'suiteName', 'expectedResult', 'steps', 'status', 'priority', 'tags'];
const CSV_TEMPLATE_EXAMPLE = [
  'Login with valid credentials',
  'Verify user can log in',
  'Auth Suite',
  'User is redirected to dashboard',
  '[{"step_number":1,"action":"Navigate to login page","expected_result":"Login page is displayed"}]',
  'DRAFT',
  'HIGH',
  'smoke|auth',
];

export default function TestCasesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Export dropdown state
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Import modal state
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    fetchTestCases();
  }, [page, filter]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    if (!exportOpen) return;
    const handler = () => setExportOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [exportOpen]);

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

  // ─── Export ───────────────────────────────────────────────────────────────

  const fetchAllForExport = async () => {
    const data = await api.get('/testcases/export');
    return data.data as ImportRow[];
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllForExport();
      const csv = Papa.unparse({ fields: CSV_TEMPLATE_HEADERS, data: rows.map(r => CSV_TEMPLATE_HEADERS.map(h => (r as any)[h] ?? '')) });
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'testcases-export.csv');
      toast.success(`Exported ${rows.length} test cases`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllForExport();
      const ws = XLSX.utils.json_to_sheet(rows, { header: CSV_TEMPLATE_HEADERS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');
      XLSX.writeFile(wb, 'testcases-export.xlsx');
      toast.success(`Exported ${rows.length} test cases`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = Papa.unparse({ fields: CSV_TEMPLATE_HEADERS, data: [CSV_TEMPLATE_EXAMPLE] });
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'testcases-import-template.csv');
  };

  // ─── Import ───────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportRows([]);
    setImportFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          if (!Array.isArray(parsed)) {
            setImportError('JSON file must be an array of test case objects');
            return;
          }
          setImportRows(parsed as ImportRow[]);
        } catch {
          setImportError('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    } else if (ext === 'csv') {
      Papa.parse<ImportRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            setImportError(`CSV parse error: ${result.errors[0].message}`);
            return;
          }
          setImportRows(result.data);
        },
        error: (err) => setImportError(`CSV parse error: ${err.message}`),
      });
    } else {
      setImportError('Only .csv and .json files are supported');
    }

    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    try {
      const result = await api.post('/testcases/bulk-import', { testCases: importRows });
      if (result.failed > 0) {
        const firstErrors = result.errors.slice(0, 3).map((e: any) => `Row ${e.row}: ${e.reason}`).join('; ');
        toast.warning(`Imported ${result.imported}, failed ${result.failed}. ${firstErrors}`);
      } else {
        toast.success(`Successfully imported ${result.imported} test cases`);
      }
      setImportOpen(false);
      setImportRows([]);
      setImportFileName('');
      fetchTestCases();
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setImportOpen(false);
    setImportRows([]);
    setImportFileName('');
    setImportError('');
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────

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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-4xl font-bold uppercase">Test Cases</h1>
            <p className="text-gray-600">Manage your test cases</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Import button */}
            <NeoButton
              variant="secondary"
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import
            </NeoButton>

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
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2 font-bold uppercase hover:bg-gray-100 border-b-2 border-black text-sm"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="w-full text-left px-4 py-2 font-bold uppercase hover:bg-gray-100 text-sm"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
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

      {/* ─── Import Modal ──────────────────────────────────────────────────── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border-3 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-3 border-black">
              <h2 className="text-2xl font-bold uppercase">Import Test Cases</h2>
              <button onClick={closeImportModal} className="p-1 hover:bg-gray-100 border-2 border-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Template download */}
              <div className="flex items-center justify-between bg-gray-50 border-2 border-black p-3">
                <span className="text-sm font-bold uppercase">Need a template?</span>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-sm font-bold uppercase underline hover:no-underline"
                >
                  Download CSV Template
                </button>
              </div>

              {/* File input */}
              <div>
                <label className="block font-bold uppercase mb-2 text-sm">Select File (.csv or .json)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileChange}
                  className="w-full border-2 border-black p-2 font-bold text-sm file:mr-4 file:py-1 file:px-3 file:border-2 file:border-black file:bg-white file:font-bold file:uppercase file:cursor-pointer hover:file:bg-gray-100"
                />
              </div>

              {/* Parse error */}
              {importError && (
                <div className="flex items-start gap-2 bg-red-50 border-2 border-red-500 p-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-red-700">{importError}</span>
                </div>
              )}

              {/* Preview */}
              {importRows.length > 0 && (
                <div>
                  <p className="font-bold uppercase text-sm mb-2">
                    Preview — {importRows.length} row{importRows.length !== 1 ? 's' : ''} detected
                  </p>
                  <div className="overflow-x-auto border-2 border-black">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-black text-white">
                          {['title', 'suiteName', 'status', 'priority'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-bold uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 font-bold truncate max-w-[200px]">{row.title}</td>
                            <td className="px-3 py-2 truncate max-w-[150px]">{row.suiteName}</td>
                            <td className="px-3 py-2">{row.status || 'DRAFT'}</td>
                            <td className="px-3 py-2">{row.priority || 'MEDIUM'}</td>
                          </tr>
                        ))}
                        {importRows.length > 5 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-center text-gray-500 italic">
                              ...and {importRows.length - 5} more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t-3 border-black">
              <NeoButton variant="secondary" onClick={closeImportModal}>
                Cancel
              </NeoButton>
              <NeoButton
                variant="primary"
                onClick={handleImport}
                disabled={importRows.length === 0 || importing}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : `Import ${importRows.length > 0 ? `${importRows.length} rows` : ''}`}
              </NeoButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
