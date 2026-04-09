'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NeoButton } from '@/components/neobrutalism/neo-button';
import { 
  Home, 
  FolderOpen, 
  FileText, 
  ClipboardList, 
  PlayCircle, 
  BarChart3, 
  Calendar,
  LogOut,
  Users,
  Ticket
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/login');
    } else if (!loading && user && isRedirecting) {
      setIsRedirecting(false);
    }
  }, [user, loading, router, isRedirecting]);

  const handleLogout = async () => {
    try {
      await logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const navigation = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/test-suites', label: 'Test Suites', icon: FolderOpen },
    { href: '/dashboard/testcases', label: 'Test Cases', icon: FileText },
    { href: '/dashboard/test-plans', label: 'Test Plans', icon: ClipboardList },
    { href: '/dashboard/test-runs', label: 'Test Runs', icon: PlayCircle },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
    { href: '/dashboard/schedules', label: 'Schedules', icon: Calendar },
    ...(isAdmin() ? [
      { href: '/dashboard/users', label: 'Users', icon: Users },
      { href: '/dashboard/admin/invitations', label: 'Invitations', icon: Ticket }
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-3 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold uppercase">Test Manager</h1>
          <div className="flex items-center gap-4">
            <span className="font-bold">{user?.username}</span>
            <NeoButton variant="danger" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </NeoButton>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 flex gap-6 mt-6">
        <aside className="w-64 flex-shrink-0">
          <nav className="border-3 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <ul className="divide-y-2 divide-black">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 font-bold uppercase transition-colors ${
                        isActive 
                          ? 'bg-[rgb(var(--neo-green))] border-l-4 border-black' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="flex-1" key={pathname}>
          {loading || !user ? (
            <div className="text-center py-12">
              <div className="text-2xl font-bold uppercase">Loading...</div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}