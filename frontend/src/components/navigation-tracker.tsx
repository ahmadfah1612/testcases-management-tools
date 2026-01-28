'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      const previousUrl = sessionStorage.getItem('currentUrl');
      if (previousUrl && previousUrl !== pathname) {
        sessionStorage.setItem('previousUrl', previousUrl);
      }
      sessionStorage.setItem('currentUrl', pathname);
    }
  }, [pathname]);

  return null;
}
