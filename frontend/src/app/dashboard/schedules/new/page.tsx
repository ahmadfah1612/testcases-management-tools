'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { toast } from 'sonner';
import { ArrowLeft, PlayCircle } from 'lucide-react';

interface TestPlan {
  id: string;
  name: string;
  description: string | null;
}

export default function NewSchedulePage() {
  const router = useRouter();
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    testPlanId: '',
    name: '',
    cronExpression: '0 0 * * *',
    active: true
  });

  const [preset, setPreset] = useState<'custom' | 'daily' | 'weekly' | 'hourly'>('daily');

  useEffect(() => {
    fetchTestPlans();
  }, []);

  const fetchTestPlans = async () => {
    try {
      const data = await api.get('/testplans?limit=100');
      setTestPlans(data.data || []);
    } catch (error) {
      toast.error('Failed to load test plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (newPreset: 'custom' | 'daily' | 'weekly' | 'hourly') => {
    setPreset(newPreset);
    const cronExpressions = {
      daily: '0 0 * * *',
      weekly: '0 0 * * 0',
      hourly: '0 * * * *',
      custom: formData.cronExpression
    };
    setFormData({ ...formData, cronExpression: cronExpressions[newPreset] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.testPlanId) {
      toast.error('Please select a test plan');
      return;
    }

    if (!formData.name) {
      toast.error('Please enter a schedule name');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/schedules', formData);
      toast.success('Schedule created successfully');
      router.push('/dashboard/schedules');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create schedule');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <div className="text-2xl font-bold uppercase">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <NeoButton
          variant="secondary"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </NeoButton>

        <div>
          <h1 className="text-4xl font-bold uppercase mb-2">New Schedule</h1>
          <p className="text-gray-600">Create a new automated test execution schedule</p>
        </div>

        <NeoCard>
          <div className="border-2 border-black bg-[rgb(255,255,0)]/30 p-4 mb-6">
            <p className="font-bold uppercase text-sm">
              ⚠️ This feature is still under development. Schedule creation is temporarily disabled.
            </p>
          </div>

          <div className="space-y-6 opacity-50 pointer-events-none">
            <div>
              <label className="block font-bold uppercase mb-2 text-sm">
                Schedule Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Daily Regression Tests"
                disabled
                className="w-full p-3 border-2 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block font-bold uppercase mb-2 text-sm">
                Test Plan
              </label>
              {testPlans.length === 0 ? (
                <div className="text-center py-8 border-2 border-black bg-gray-50">
                  <PlayCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="font-bold uppercase mb-4">No test plans available</p>
                  <NeoButton
                    type="button"
                    variant="primary"
                    onClick={() => router.push('/dashboard/test-plans/new')}
                    className="inline-flex items-center gap-2"
                  >
                    Create Test Plan
                  </NeoButton>
                </div>
              ) : (
                <select
                  value={formData.testPlanId}
                  onChange={(e) => setFormData({ ...formData, testPlanId: e.target.value })}
                  disabled
                  className="w-full p-3 border-2 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select a test plan</option>
                  {testPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-bold uppercase mb-2 text-sm">
                Schedule Frequency
              </label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <NeoButton
                  type="button"
                  variant={preset === 'hourly' ? 'primary' : 'secondary'}
                  disabled
                  className="font-bold text-sm"
                >
                  Hourly
                </NeoButton>
                <NeoButton
                  type="button"
                  variant={preset === 'daily' ? 'primary' : 'secondary'}
                  disabled
                  className="font-bold text-sm"
                >
                  Daily
                </NeoButton>
                <NeoButton
                  type="button"
                  variant={preset === 'weekly' ? 'primary' : 'secondary'}
                  disabled
                  className="font-bold text-sm"
                >
                  Weekly
                </NeoButton>
                <NeoButton
                  type="button"
                  variant={preset === 'custom' ? 'primary' : 'secondary'}
                  disabled
                  className="font-bold text-sm"
                >
                  Custom
                </NeoButton>
              </div>
              
              <label className="block font-bold uppercase mb-2 text-sm">
                Cron Expression
              </label>
              <input
                type="text"
                value={formData.cronExpression}
                onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                placeholder="e.g., 0 0 * * *"
                disabled
                className={`w-full p-3 border-2 border-black font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black bg-gray-100`}
              />
              <p className="text-xs text-gray-500 mt-2">
                Format: minute hour day-of-month month day-of-week<br />
                Example: "0 0 * * *" = At 00:00 every day
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                disabled
                className="w-5 h-5 border-2 border-black"
              />
              <label htmlFor="active" className="font-bold uppercase text-sm">
                Activate schedule immediately
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <NeoButton
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </NeoButton>
              <NeoButton
                type="submit"
                variant="primary"
                disabled
                className="flex-1"
              >
                Create Schedule
              </NeoButton>
            </div>
          </div>
        </NeoCard>
      </div>
    </div>
  );
}
