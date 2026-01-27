'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Username or email already exists');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--neo-blue))] p-4">
      <NeoCard className="w-full max-w-md">
        <h1 className="text-4xl mb-2 text-center">Register</h1>
        <p className="text-center mb-8">Create your account</p>

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
              placeholder="Choose username"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block font-bold uppercase mb-2">Email</label>
            <NeoInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
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
              placeholder="Choose password"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block font-bold uppercase mb-2">Confirm Password</label>
            <NeoInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              className="w-full"
            />
          </div>

          <NeoButton type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </NeoButton>
        </form>

        <p className="text-center mt-6">
          Already have an account?{' '}
          <a href="/login" className="font-bold underline hover:no-underline">
            Login
          </a>
        </p>
      </NeoCard>
    </div>
  );
}