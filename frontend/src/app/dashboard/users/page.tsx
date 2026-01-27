'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { Trash2, Plus, User as UserIcon } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      return;
    }
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/users');
      setUsers(data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    try {
      await api.post('/users', formData);
      setShowCreateModal(false);
      setFormData({ username: '', email: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-4xl font-bold uppercase mb-8">Access Denied</h1>
        <p className="text-xl">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold uppercase mb-2">User Management</h1>
            <p className="text-gray-600">Manage user accounts and roles</p>
          </div>
          <NeoButton 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create User
          </NeoButton>
        </div>

        {error && (
          <div className="border-2 border-black bg-[rgb(var(--neo-red))] p-4 mb-6 flex items-center gap-2 font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <NeoCard>
            <p className="text-center py-8">Loading users...</p>
          </NeoCard>
        ) : (
          <NeoCard>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left p-4 font-bold uppercase">Username</th>
                    <th className="text-left p-4 font-bold uppercase">Email</th>
                    <th className="text-left p-4 font-bold uppercase">Role</th>
                    <th className="text-left p-4 font-bold uppercase">Created At</th>
                    <th className="text-right p-4 font-bold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-black last:border-b-0">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[rgb(var(--neo-blue))] border-2 border-black flex items-center justify-center">
                            <UserIcon className="w-6 h-6" />
                          </div>
                          <span className="font-bold">{user.username}</span>
                          {user.id === currentUser?.id && (
                            <span className="text-xs bg-gray-300 border border-black px-2 py-1 font-bold">You</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 font-bold border-2 border-black ${
                          user.role === 'admin' 
                            ? 'bg-[rgb(var(--neo-orange))]' 
                            : 'bg-gray-300'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        {user.id !== currentUser?.id && (
                          <NeoButton
                            variant="danger"
                            onClick={() => handleDeleteUser(user.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </NeoButton>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <p className="text-gray-500 font-bold">No users found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </NeoCard>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <NeoCard className="w-full max-w-md">
              <h2 className="text-2xl font-bold uppercase mb-6">Create New User</h2>
              
              {error && (
                <div className="border-2 border-black bg-[rgb(var(--neo-red))] p-4 mb-4 font-bold">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase mb-2">Username</label>
                  <NeoInput
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter username"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-2">Email</label>
                  <NeoInput
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-2">Password</label>
                  <NeoInput
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                    className="w-full p-3 border-3 border-black bg-white font-bold uppercase focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <NeoButton
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </NeoButton>
                  <NeoButton type="submit" variant="primary" className="flex-1">
                    Create User
                  </NeoButton>
                </div>
              </form>
            </NeoCard>
          </div>
        )}
      </div>
    </div>
  );
}
