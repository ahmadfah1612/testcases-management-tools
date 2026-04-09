'use client';

import { useState, useEffect } from 'react';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { NeoBadge } from '@/components/neobrutalism/neo-badge';
import { AlertCircle, Plus, Trash2, Clock, Users, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface InvitationCode {
  id: string;
  code: string;
  expires_at: string;
  created_at: string;
  creator?: { username: string };
  usage_count: number;
}

interface CodeUsage {
  id: string;
  user: { username: string; email: string };
  used_at: string;
}

export default function InvitationManagementPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<InvitationCode | null>(null);
  const [codeUsages, setCodeUsages] = useState<CodeUsage[]>([]);
  
  // Create form state
  const [newCode, setNewCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Set default expiration to 7 days from now
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    setExpiresAt(sevenDaysFromNow.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    if (userId) {
      fetchCodes();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invitation`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch invitation codes');
      }

      const data = await response.json();
      setCodes(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invitation codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCode.trim() || !expiresAt) {
      setError('Code and expiration date are required');
      return;
    }

    try {
      setCreating(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            code: newCode.trim(),
            expires_at: new Date(expiresAt).toISOString()
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invitation code');
      }

      // Reset form and close modal
      setNewCode('');
      setShowCreateModal(false);
      
      // Refresh the list
      fetchCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to create invitation code');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invitation code?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invitation/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete invitation code');
      }

      fetchCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to delete invitation code');
    }
  };

  const handleExtendCode = async (id: string) => {
    const newExpiration = prompt('Enter new expiration date (YYYY-MM-DD HH:MM):');
    if (!newExpiration) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invitation/${id}/extend`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            expires_at: new Date(newExpiration).toISOString()
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to extend invitation code');
      }

      fetchCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to extend invitation code');
    }
  };

  const viewUsage = async (code: InvitationCode) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invitation/${code.id}/usage`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch usage details');
      }

      const data = await response.json();
      setCodeUsages(data.data || []);
      setSelectedCode(code);
      setShowUsageModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch usage details');
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4">Loading invitation codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Invitation Codes</h1>
          <p className="text-gray-600 mt-1">Manage invitation codes for user registration</p>
        </div>
        <NeoButton
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Code
        </NeoButton>
      </div>

      {error && (
        <div className="border-2 border-black bg-[rgb(var(--neo-red))] p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-bold">{error}</span>
          <button 
            onClick={() => setError('')}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <NeoCard>
        {codes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No invitation codes yet.</p>
            <p className="text-sm text-gray-400 mt-1">Create one to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-3 px-4 font-bold uppercase">Code</th>
                  <th className="text-left py-3 px-4 font-bold uppercase">Status</th>
                  <th className="text-left py-3 px-4 font-bold uppercase">Expires</th>
                  <th className="text-left py-3 px-4 font-bold uppercase">Usage</th>
                  <th className="text-left py-3 px-4 font-bold uppercase">Created By</th>
                  <th className="text-right py-3 px-4 font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                        {code.code}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      {isExpired(code.expires_at) ? (
                        <NeoBadge variant="danger">Expired</NeoBadge>
                      ) : (
                        <NeoBadge variant="success">Active</NeoBadge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4" />
                        {formatDate(code.expires_at)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => viewUsage(code)}
                        className="flex items-center gap-1 text-sm hover:underline"
                      >
                        <Users className="w-4 h-4" />
                        {code.usage_count} users
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {code.creator?.username || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleExtendCode(code.id)}
                          className="p-2 hover:bg-gray-200 rounded"
                          title="Extend expiration"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCode(code.id)}
                          className="p-2 hover:bg-red-100 rounded text-red-600"
                          title="Delete code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeoCard>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <NeoCard className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Invitation Code</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block font-bold uppercase mb-2">Code</label>
                <NeoInput
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g., WELCOME2024"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-2">Expires At</label>
                <NeoInput
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  required
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: 7 days from now
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <NeoButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </NeoButton>
                <NeoButton
                  type="submit"
                  variant="primary"
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? 'Creating...' : 'Create Code'}
                </NeoButton>
              </div>
            </form>
          </NeoCard>
        </div>
      )}

      {/* Usage Modal */}
      {showUsageModal && selectedCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <NeoCard className="w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Code Usage</h2>
                <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
                  {selectedCode.code}
                </code>
              </div>
              <button onClick={() => setShowUsageModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {codeUsages.length === 0 ? (
              <p className="text-gray-500 py-4">No users have used this code yet.</p>
            ) : (
              <div className="space-y-3">
                {codeUsages.map((usage) => (
                  <div 
                    key={usage.id}
                    className="border-2 border-black p-3 rounded"
                  >
                    <div className="font-bold">{usage.user.username}</div>
                    <div className="text-sm text-gray-600">{usage.user.email}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Used on {formatDate(usage.used_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <NeoButton
              variant="secondary"
              onClick={() => setShowUsageModal(false)}
              className="w-full mt-4"
            >
              Close
            </NeoButton>
          </NeoCard>
        </div>
      )}
    </div>
  );
}
