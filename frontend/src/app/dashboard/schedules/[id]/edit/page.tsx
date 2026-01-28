'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { toast } from 'sonner';
import { ArrowLeft, PlayCircle, Loader2 } from 'lucide-react';

interface TestPlan {
  id: string;
  name: string;
  description: string | null;
}

interface Schedule {
  id: string;
  name: string;
  cronExpression: string;
  active: boolean;
  testPlanId: string;
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  testPlan: {
    id: string;
    name: string;
    description: string | null;
  };
}

export default function EditSchedulePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    cronExpression: '0 0 * * *',
    active: true
  });

  const [preset, setPreset] = useState<'custom' | 'daily' | 'weekly' | 'hourly'>('daily');

  useEffect(() => {
    fetchSchedule();
    fetchTestPlans();
  }, [params.id]);

  const fetchSchedule = async () => {
    try {
      const data = await api.get(`/schedules/${params.id}`);
      setSchedule(data);
      setFormData({
        name: data.name,
        cronExpression: data.cronExpression,
        active: data.active
      });
      determinePreset(data.cronExpression);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load schedule');
      router.push('/dashboard/schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchTestPlans = async () => {
    try {
      const data = await api.get('/testplans?limit=100');
      setTestPlans(data.data || []);
    } catch (error) {
      toast.error('Failed to load test plans');
    }
  };

  const determinePreset = (cron: string) => {
    if (cron === '0 * * * *') {
      setPreset('hourly');
    } else if (cron === '0 0 * * *') {
      setPreset('daily');
    } else if (cron === '0 0 * * 0') {
      setPreset('weekly');
    } else {
      setPreset('custom');
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
    
    if (!formData.name) {
      toast.error('Please enter a schedule name');
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/schedules/${params.id}`, formData);
      toast.success('Schedule updated successfully');
      router.push('/dashboard/schedules');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update schedule');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <div className="text-2xl font-bold uppercase">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-3xl mx-auto">
          <NeoButton
            variant="secondary"
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </NeoButton>
          <NeoCard>
            <div className="text-center py-12">
              <p className="font-bold uppercase">Schedule not found</p>
            </div>
          </NeoCard>
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
          <h1 className="text-4xl font-bold uppercase mb-2">Edit Schedule</h1>
          <p className="text-gray-600">Update schedule configuration</p>
        </div>

        <NeoCard>
          <div className="border-2 border-black bg-[rgb(255,255,0)]/30 p-4 mb-6">
            <p className="font-bold uppercase text-sm">
              ⚠️ This feature is still under development
            </p>
          </div>
          <div className="mb-6 p-4 border-2 border-black bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="w-5 h-5" />
              <span className="font-bold uppercase text-sm">Test Plan:</span>
              <span className="font-bold">{schedule.testPlan.name}</span>
            </div>
            <p className="text-xs text-gray-600">
              Note: You cannot change the test plan for an existing schedule. Create a new schedule if needed.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-bold uppercase mb-2 text-sm">
                Schedule Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Daily Regression Tests"
                className="w-full p-3 border-2 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block font-bold uppercase mb-2 text-sm">
                Schedule Frequency
              </label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <NeoButton
                  type="button"
                  variant={preset === 'hourly' ? 'primary' : 'secondary'}
                  onClick={() => handlePresetChange('hourly')}
                  className="font-bold text-sm"
                >
                  Hourly
                </NeoButton>
                <NeoButton
                  type="button"
                  variant={preset === 'daily' ? 'primary' : 'secondary'}
                  onClick={() => handlePresetChange('daily')}
                  className="font-bold text-sm"
                >
                  Daily
                </NeoButton>
                <NeoButton
                  type="button"
                  variant={preset === 'weekly' ? 'primary' : 'secondary'}
                  onClick={() => handlePresetChange('weekly')}
                  className="font-bold text-sm"
                >
                  Weekly
                </NeoButton>
                <NeoButton
                  type="button"
                  variant={preset === 'custom' ? 'primary' : 'secondary'}
                  onClick={() => handlePresetChange('custom')}
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
                disabled={preset !== 'custom'}
                className={`w-full p-3 border-2 border-black font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black ${
                  preset !== 'custom' ? 'bg-gray-100' : 'bg-white'
                }`}
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
                className="w-5 h-5 border-2 border-black"
              />
              <label htmlFor="active" className="font-bold uppercase text-sm">
                Schedule is active
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
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Updating...' : 'Update Schedule'}
              </NeoButton>
            </div>
          </form>
        </NeoCard>
      </div>
    </div>
  );
}
