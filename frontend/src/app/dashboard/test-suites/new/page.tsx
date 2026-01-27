'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { toast } from 'sonner';
import { ArrowLeft, FolderOpen } from 'lucide-react';

export default function NewTestSuitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Suite name is required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        description: formData.description || null,
        parentId: formData.parentId || null
      };

      console.log('📝 Submitting test suite:', payload);
      
      const result = await api.post('/testsuites', payload);
      console.log('✅ API Response:', result);
      
      toast.success('Test suite created successfully');
      router.push('/dashboard/test-suites');
    } catch (err: any) {
      console.error('❌ Error creating test suite:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      setError(err.message || 'Failed to create test suite');
      toast.error('Failed to create test suite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
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
            <h1 className="text-4xl font-bold uppercase">New Test Suite</h1>
            <p className="text-gray-600">Create a new test suite to organize your test cases</p>
          </div>
        </div>

        <NeoCard>
          {error && (
            <div className="border-2 border-black bg-[rgb(239,68,68)] p-4 mb-6 font-bold flex items-center gap-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 p-6 bg-[rgb(57,255,20)]/10 border-2 border-black">
              <div className="w-16 h-16 bg-[rgb(57,255,20)] border-2 border-black flex items-center justify-center">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase">Suite Details</h2>
                <p className="text-gray-600">Provide the basic information for your test suite</p>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase mb-2">Suite Name *</label>
              <NeoInput
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Login Module Tests"
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block font-bold uppercase mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this test suite covers..."
                className="w-full p-4 border-2 border-black bg-white focus:border-3 focus:outline-none focus:border-[rgb(0,191,255)] transition-all min-h-[120px]"
                rows={4}
              />
            </div>

            <div className="flex gap-4 pt-6">
              <NeoButton
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </NeoButton>
              <NeoButton
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Suite'}
              </NeoButton>
            </div>
          </form>
        </NeoCard>
      </div>
    </div>
  );
}
