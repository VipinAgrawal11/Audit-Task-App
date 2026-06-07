import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  BarChart3,
  Bell,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Roles allowed to see this item; omit = everyone. */
  roles?: UserRole[];
  /** Show in the mobile bottom bar. */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
  { to: '/tasks', label: 'Tasks', icon: ListChecks, mobile: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['partner', 'manager'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, mobile: true },
  { to: '/profile', label: 'Profile', icon: User, mobile: true },
];

export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
}
