import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsData } from '@/contexts/DataContext';
import { navForRole } from './nav';
import { Avatar } from '@/components/ui/Misc';
import { ROLE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

export function Layout() {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotificationsData();
  const location = useLocation();

  if (!profile) return null;
  const items = navForRole(profile.role);
  const mobileItems = items.filter((i) => i.mobile);

  const pageTitle = items.find((i) => i.to === location.pathname)?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-navy-50">
      {/* ---------------- Desktop sidebar ---------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-700 text-white lg:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <div>
            <p className="text-sm font-bold leading-tight">Audit Firm</p>
            <p className="text-xs text-navy-200">Task Manager</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-gold-500 text-navy-900'
                    : 'text-navy-100 hover:bg-navy-600 hover:text-white',
                )
              }
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.to === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-navy-600 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={profile.name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{profile.name}</p>
              <p className="truncate text-xs text-navy-200">{ROLE_LABELS[profile.role]}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-2 text-navy-200 hover:bg-navy-600 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- Mobile top bar ---------------- */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-navy-100 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="font-bold text-navy-800">{pageTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar name={profile.name} size={32} />
          <button
            onClick={signOut}
            className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ---------------- Main content ---------------- */}
      <main className="px-4 pb-24 pt-4 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* ---------------- Mobile bottom nav ---------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-navy-100 bg-white lg:hidden">
        {mobileItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                isActive ? 'text-gold-600' : 'text-navy-400',
              )
            }
          >
            <item.icon size={21} />
            <span>{item.label}</span>
            {item.to === '/notifications' && unreadCount > 0 && (
              <span className="absolute right-1/2 top-1 translate-x-3 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
