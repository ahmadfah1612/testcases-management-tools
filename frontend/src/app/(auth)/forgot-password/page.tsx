'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      await forgotPassword(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--neo-yellow))] p-4">
      <NeoCard className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 font-bold text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>

        <h1 className="text-4xl mb-2 text-center">Reset Password</h1>
        <p className="text-center mb-8">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <div className="border-2 border-black bg-[rgb(var(--neo-red))] p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {success && (
          <div className="border-2 border-black bg-[rgb(var(--neo-green))] p-4 mb-6 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">Email sent!</span>
              <p className="mt-1 text-sm">
                If an account with that email exists, you will receive a password reset link shortly.
                Please check your inbox and spam folder.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold uppercase mb-2">Email Address</label>
            <NeoInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={success}
              className="w-full"
            />
          </div>

          <NeoButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading || success}
          >
            {loading ? 'Sending...' : success ? 'Email Sent' : 'Send Reset Link'}
          </NeoButton>
        </form>

        <p className="text-center mt-6 text-sm">
          Remember your password?{' '}
          <Link href="/login" className="font-bold underline hover:no-underline">
            Login here
          </Link>
        </p>
      </NeoCard>
    </div>
  );
}
