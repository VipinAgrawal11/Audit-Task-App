import { format, isToday, isPast, parseISO, differenceInCalendarDays } from 'date-fns';
import type { Task, TaskStatus, TaskPriority } from '@/types';

/** Tiny classnames joiner (avoids an extra dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatDate(value: string | null, fallback = '—'): string {
  if (!value) return fallback;
  try {
    return format(parseISO(value), 'd MMM yyyy');
  } catch {
    return fallback;
  }
}

export function formatDateTime(value: string): string {
  try {
    return format(parseISO(value), 'd MMM yyyy, HH:mm');
  } catch {
    return value;
  }
}

/** A task is "delayed" when its deadline has passed and it isn't completed. */
export function isDelayed(task: Pick<Task, 'deadline' | 'status'>): boolean {
  if (!task.deadline || task.status === 'COMPLETED') return false;
  const d = parseISO(task.deadline);
  return isPast(d) && !isToday(d);
}

export function isDueToday(task: Pick<Task, 'deadline'>): boolean {
  if (!task.deadline) return false;
  return isToday(parseISO(task.deadline));
}

/** Days until deadline (negative = overdue). Null when no deadline. */
export function daysUntilDeadline(task: Pick<Task, 'deadline'>): number | null {
  if (!task.deadline) return null;
  return differenceInCalendarDays(parseISO(task.deadline), new Date());
}

// --- Theme color maps --------------------------------------------------------

export const STATUS_STYLES: Record<TaskStatus, string> = {
  NOT_STARTED: 'bg-navy-100 text-navy-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  WAITING_FOR_REVIEW: 'bg-gold-100 text-gold-700',
  COMPLETED: 'bg-green-100 text-green-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
};

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-gold-100 text-gold-700',
  LOW: 'bg-navy-100 text-navy-600',
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
