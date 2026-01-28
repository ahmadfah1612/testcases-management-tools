'use client';

import { useRouter } from 'next/navigation';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    const previousUrl = sessionStorage.getItem('previousUrl');
    if (previousUrl && previousUrl !== '/') {
      sessionStorage.setItem('notFoundPreviousUrl', previousUrl);
    }
  }, []);

  const handleGoBack = () => {
    const previousUrl = sessionStorage.getItem('notFoundPreviousUrl');
    if (previousUrl && previousUrl !== '/') {
      router.push(previousUrl);
    } else {
      router.push('/dashboard');
    }
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white border-3 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-[rgb(255,105,180)] border-2 border-black flex items-center justify-center">
              <AlertCircle className="w-12 h-12" />
            </div>
          </div>
          
          <h1 className="text-6xl font-bold uppercase mb-4">404</h1>
          <h2 className="text-2xl font-bold uppercase mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex flex-col gap-4">
            <NeoButton 
              variant="primary" 
              onClick={handleGoBack}
              className="w-full"
            >
              Go Back
            </NeoButton>
            <NeoButton 
              variant="secondary" 
              onClick={handleGoHome}
              className="w-full"
            >
              Go to Dashboard
            </NeoButton>
          </div>
        </div>
      </div>
    </div>
  );
}
