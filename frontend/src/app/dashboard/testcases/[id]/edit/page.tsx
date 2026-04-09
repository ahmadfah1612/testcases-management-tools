'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Plus, Trash2 } from 'lucide-react';

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
  suite: {
    id: string;
  };
}

export default function EditTestCasePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const caseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    steps: [] as Step[],
    expectedResult: '',
    status: 'DRAFT' as 'DRAFT' | 'READY' | 'REVIEW' | 'APPROVED',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (userId) {
      fetchTestCase();
    } else {
      setLoading(false);
    }
  }, [userId, caseId]);

  const fetchTestCase = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/testcases/${caseId}`);
      setFormData({
        title: data.title,
        description: data.description || '',
        steps: Array.isArray(data.steps) ? data.steps : [],
        expectedResult: data.expected_result || '',
        status: data.status,
        priority: data.priority,
        tags: Array.isArray(data.tags) ? data.tags : []
      });
    } catch (error) {
      toast.error('Failed to load test case');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    const stepNumber = formData.steps.length + 1;
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          step_number: stepNumber,
          action: '',
          expected_result: ''
        }
      ]
    });
  };

  const updateStep = (index: number, field: 'action' | 'expected_result', value: string) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      [field]: value
    };
    setFormData({
      ...formData,
      steps: updatedSteps
    });
  };

  const removeStep = (index: number) => {
    const updatedSteps = formData.steps.filter((_, i) => i !== index).map((step, i) => ({
      ...step,
      step_number: i + 1
    }));
    setFormData({
      ...formData,
      steps: updatedSteps
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Test case title is required');
      return;
    }

    if (formData.steps.length === 0) {
      toast.error('At least one test step is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title,
        description: formData.description || null,
        steps: formData.steps,
        expectedResult: formData.expectedResult || null,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags
      };

      await api.put(`/testcases/${caseId}`, payload);
      toast.success('Test case updated successfully');
      router.push(`/dashboard/testcases/${caseId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update test case');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-2xl font-bold uppercase">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <NeoButton
            variant="secondary"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </NeoButton>
          <div>
            <h1 className="text-4xl font-bold uppercase">Edit Test Case</h1>
            <p className="text-gray-600">Update the details of this test case</p>
          </div>
        </div>

        <NeoCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 p-6 bg-[rgb(147,197,253)]/10 border-2 border-black">
              <div className="w-16 h-16 bg-[rgb(147,197,253)] border-2 border-black flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase">Test Case Details</h2>
                <p className="text-gray-600">Update the information for your test case</p>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase mb-2">Title *</label>
              <NeoInput
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Verify user can login with valid credentials"
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block font-bold uppercase mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this test case covers..."
                className="w-full p-4 border-2 border-black bg-white focus:border-3 focus:outline-none focus:border-[rgb(147,197,253)] transition-all min-h-[100px]"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full p-3 border-3 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="READY">Ready</option>
                  <option value="REVIEW">Review</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full p-3 border-3 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <NeoInput
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1"
                />
                <NeoButton type="button" variant="secondary" onClick={addTag}>
                  <Plus className="w-5 h-5" />
                </NeoButton>
              </div>
              {Array.isArray(formData.tags) && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[rgb(134,239,172)] border-2 border-black text-sm font-bold"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block font-bold uppercase mb-0">Test Steps *</label>
                <NeoButton
                  type="button"
                  variant="primary"
                  onClick={addStep}
                  className="flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </NeoButton>
              </div>

              {formData.steps.length === 0 ? (
                <div className="border-2 border-dashed border-black p-8 text-center">
                  <p className="text-gray-500 font-bold">No test steps added yet</p>
                  <p className="text-sm text-gray-400">Click &quot;Add Step&quot; to create your first step</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(formData.steps) && formData.steps.map((step: any, index: number) => (
                    <NeoCard key={index} className="bg-gray-50">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-[rgb(134,239,172)] border-2 border-black flex items-center justify-center font-bold text-lg flex-shrink-0">
                          {step.step_number}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-sm font-bold uppercase mb-1">Action</label>
                            <textarea
                              value={step.action}
                              onChange={(e) => updateStep(index, 'action', e.target.value)}
                              placeholder="Describe action to perform..."
                              className="w-full p-3 border-2 border-black bg-white focus:border-3 focus:outline-none focus:border-[rgb(147,197,253)] transition-all min-h-[60px]"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold uppercase mb-1">Expected Result</label>
                            <textarea
                              value={step.expected_result}
                              onChange={(e) => updateStep(index, 'expected_result', e.target.value)}
                              placeholder="Describe expected result..."
                              className="w-full p-3 border-2 border-black bg-white focus:border-3 focus:outline-none focus:border-[rgb(147,197,253)] transition-all min-h-[60px]"
                              rows={2}
                            />
                          </div>
                        </div>
                        <NeoButton
                          type="button"
                          variant="danger"
                          onClick={() => removeStep(index)}
                          className="px-3 py-2 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </NeoButton>
                      </div>
                    </NeoCard>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold uppercase mb-2">Overall Expected Result</label>
              <textarea
                value={formData.expectedResult}
                onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
                placeholder="Describe the overall expected result of this test case..."
                className="w-full p-4 border-2 border-black bg-white focus:border-3 focus:outline-none focus:border-[rgb(147,197,253)] transition-all min-h-[80px]"
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-6">
              <NeoButton
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </NeoButton>
              <NeoButton
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? 'Updating...' : 'Save Changes'}
              </NeoButton>
            </div>
          </form>
        </NeoCard>
      </div>
    </div>
  );
}
