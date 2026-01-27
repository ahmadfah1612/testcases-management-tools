'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--neo-yellow))] p-4">
      <NeoCard className="w-full max-w-md">
        <h1 className="text-4xl mb-2 text-center">Login</h1>
        <p className="text-center mb-8">Welcome back to Test Manager</p>

        {error && (
          <div className="border-2 border-black bg-[rgb(var(--neo-red))] p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold uppercase mb-2">Username</label>
            <NeoInput
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block font-bold uppercase mb-2">Password</label>
            <NeoInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full"
            />
          </div>

          <NeoButton type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </NeoButton>
        </form>

        <p className="text-center mt-6">
          Don't have an account?{' '}
          <a href="/register" className="font-bold underline hover:no-underline">
            Register
          </a>
        </p>
      </NeoCard>
    </div>
  );
}