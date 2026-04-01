'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { NeoCard } from '@/components/neobrutalism/neo-card';
import { NeoInput } from '@/components/neobrutalism/neo-input';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const { resetPassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Extract token from URL hash on mount
  useEffect(() => {
    console.log('Full URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const token = hashParams.get('access_token');
      console.log('Found token:', token ? 'Yes (length: ' + token.length + ')' : 'No');
      setAccessToken(token);
    } else {
      console.log('No access_token in hash');
      setAccessToken(null);
    }
    setIsChecking(false);
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!accessToken) {
      setError('Invalid or missing reset token. Please request a new reset link.');
      return;
    }

    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(accessToken, newPassword);
      setSuccess(true);
      // Clear the hash from URL for security
      window.history.replaceState(null, '', window.location.pathname);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking for token
  if (isChecking) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
        <p className="mt-2">Loading...</p>
      </div>
    );
  }

  // If no token in URL, show error
  if (!accessToken) {
    return (
      <>
        <div className="border-2 border-black bg-[rgb(var(--neo-red))] p-4 mb-6 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Invalid Reset Link</span>
            <p className="mt-1 text-sm">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
        </div>
        <Link href="/forgot-password">
          <NeoButton variant="primary" className="w-full">
            Request New Reset Link
          </NeoButton>
        </Link>
      </>
    );
  }

  return (
    <>
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
            <span className="font-bold">Password Reset Successful!</span>
            <p className="mt-1 text-sm">
              Your password has been updated. You can now log in with your new password.
            </p>
            <Link href="/login" className="inline-block mt-4">
              <NeoButton variant="primary">Go to Login</NeoButton>
            </Link>
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold uppercase mb-2">New Password</label>
            <div className="relative">
              <NeoInput
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="w-full pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs mt-2 text-gray-600">
              Must be at least 8 characters with uppercase, lowercase, and number.
            </p>
          </div>

          <div>
            <label className="block font-bold uppercase mb-2">Confirm Password</label>
            <div className="relative">
              <NeoInput
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <NeoButton type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </NeoButton>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--neo-yellow))] p-4">
      <NeoCard className="w-full max-w-md">
        <h1 className="text-4xl mb-2 text-center">Set New Password</h1>
        <p className="text-center mb-8">Enter your new password below.</p>

        <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </NeoCard>
    </div>
  );
}
