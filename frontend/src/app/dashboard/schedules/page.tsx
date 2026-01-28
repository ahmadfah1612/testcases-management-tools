'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { toast } from 'sonner';
import { Edit2, Trash2, Clock, Calendar, Play, Pause } from 'lucide-react';

interface Schedule {
  id: string;
  name: string;
  cronExpression: string;
  active: boolean;
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  testPlan: {
    id: string;
    name: string;
    description: string | null;
  };
}

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const data = await api.get('/schedules');
      setSchedules(data.data || []);
    } catch (error) {
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      await api.delete(`/schedules/${id}`);
      toast.success('Schedule deleted successfully');
      fetchSchedules();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete schedule');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      setToggleLoading(id);
      await api.put(`/schedules/${id}`, { active: !active });
      toast.success(active ? 'Schedule paused' : 'Schedule activated');
      fetchSchedules();
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle schedule');
    } finally {
      setToggleLoading(null);
    }
  };

  const getCronDescription = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length >= 5) {
      return `Run at ${parts[2]}:${parts[1]} ${parts[4] === '*' ? 'every day' : `on ${parts[4]}`}`;
    }
    return cron;
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
        <div className="border-2 border-black bg-[rgb(255,255,0)]/30 p-4 mb-6">
          <p className="font-bold uppercase text-sm">
            ⚠️ This feature is still under development
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold uppercase">Schedules</h1>
            <p className="text-gray-600">Manage automated test execution schedules</p>
          </div>
        </div>

        {schedules.length === 0 ? (
          <NeoCard>
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-bold uppercase mb-2">No schedules found</h2>
              <p className="text-gray-600">Schedule creation is currently under development</p>
            </div>
          </NeoCard>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <NeoCard key={schedule.id} className="hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-3 py-1 text-xs font-bold border-2 border-black uppercase ${schedule.active ? 'bg-[rgb(57,255,20)]' : 'bg-gray-400'}`}>
                        {schedule.active ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold uppercase mb-2">{schedule.name}</h3>
                    <div className="text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Play className="w-4 h-4" />
                        <span className="font-bold">Test Plan:</span>
                        <span>{schedule.testPlan.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="font-bold">Schedule:</span>
                        <span>{getCronDescription(schedule.cronExpression)}</span>
                      </div>
                      {schedule.nextRunAt && (
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span className="font-bold">Next Run:</span>
                          <span>{new Date(schedule.nextRunAt).toLocaleString()}</span>
                        </div>
                      )}
                      {schedule.lastRunAt && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className="font-bold">Last Run:</span>
                          <span>{new Date(schedule.lastRunAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <NeoButton
                      variant="secondary"
                      onClick={() => handleToggle(schedule.id, schedule.active)}
                      disabled={toggleLoading === schedule.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      {toggleLoading === schedule.id ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : schedule.active ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {schedule.active ? 'Pause' : 'Activate'}
                    </NeoButton>
                    <NeoButton
                      variant="secondary"
                      onClick={() => router.push(`/dashboard/schedules/${schedule.id}/edit`)}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </NeoButton>
                    <NeoButton
                      variant="danger"
                      onClick={() => handleDelete(schedule.id)}
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
      </div>
    </div>
  );
}
