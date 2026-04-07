'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { toast } from 'sonner';
import { Users, UserPlus, Trash2, X } from 'lucide-react';

interface Collaborator {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: 'editor' | 'viewer';
  invitedBy: string;
  createdAt: string;
}

interface CollaboratorsPanelProps {
  resourceType: 'suite' | 'testcase' | 'testrun';
  resourceId: string;
  isOwner: boolean;
}

const ENDPOINT_MAP = {
  suite:    (id: string) => `/testsuites/${id}/collaborators`,
  testcase: (id: string) => `/testcases/${id}/collaborators`,
  testrun:  (id: string) => `/testruns/${id}/collaborators`,
};

export function CollaboratorsPanel({ resourceType, resourceId, isOwner }: CollaboratorsPanelProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ username: '', role: 'viewer' });
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const endpoint = ENDPOINT_MAP[resourceType](resourceId);

  useEffect(() => {
    fetchCollaborators();
  }, [resourceId]);

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      const data = await api.get(endpoint);
      setCollaborators(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail — user may not have access to collaborator list
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.username.trim()) return;
    setInviting(true);
    try {
      await api.post(endpoint, { username: inviteForm.username.trim(), collabRole: inviteForm.role });
      toast.success(`${inviteForm.username} invited as ${inviteForm.role}`);
      setInviteForm({ username: '', role: 'viewer' });
      setShowInviteModal(false);
      fetchCollaborators();
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite collaborator');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (collab: Collaborator) => {
    if (!confirm(`Remove ${collab.username} from this resource?`)) return;
    setRemovingId(collab.id);
    try {
      await api.delete(`${endpoint}/${collab.userId}`);
      toast.success(`${collab.username} removed`);
      setCollaborators(prev => prev.filter(c => c.id !== collab.id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove collaborator');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <NeoCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold uppercase flex items-center gap-2">
          <Users className="w-5 h-5" />
          Collaborators
        </h2>
        {isOwner && (
          <NeoButton
            variant="primary"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Invite
          </NeoButton>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 font-bold uppercase">Loading…</p>
      ) : collaborators.length === 0 ? (
        <p className="text-sm text-gray-500">No collaborators yet.</p>
      ) : (
        <div className="space-y-2">
          {collaborators.map(collab => (
            <div key={collab.id} className="flex items-center justify-between p-2 border-2 border-black bg-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <div className="font-bold text-sm truncate">{collab.username}</div>
                <span className={`px-2 py-0.5 text-xs font-bold border border-black uppercase flex-shrink-0 ${collab.role === 'editor' ? 'bg-[rgb(57,255,20)]' : 'bg-gray-200'}`}>
                  {collab.role}
                </span>
              </div>
              {isOwner && (
                <button
                  onClick={() => handleRemove(collab)}
                  disabled={removingId === collab.id}
                  className="ml-2 p-1 border-2 border-black hover:bg-red-100 flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-5 border-b-2 border-black">
              <h3 className="text-xl font-bold uppercase">Invite Collaborator</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-gray-100 border-2 border-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div>
                <label className="block font-bold uppercase mb-2 text-sm">Username</label>
                <input
                  type="text"
                  value={inviteForm.username}
                  onChange={e => setInviteForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Enter username"
                  required
                  className="w-full border-2 border-black p-2 font-bold focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-2 text-sm">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border-2 border-black p-2 font-bold uppercase bg-white focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="viewer">Viewer (read-only)</option>
                  <option value="editor">Editor (read + write)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <NeoButton type="button" variant="secondary" onClick={() => setShowInviteModal(false)} className="flex-1">
                  Cancel
                </NeoButton>
                <NeoButton type="submit" variant="primary" disabled={inviting} className="flex-1">
                  {inviting ? 'Inviting…' : 'Send Invite'}
                </NeoButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </NeoCard>
  );
}
