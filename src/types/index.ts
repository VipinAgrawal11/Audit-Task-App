// Domain types shared across the app. These mirror the database schema.

export type UserRole = 'partner' | 'manager' | 'employee';

export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_REVIEW'
  | 'COMPLETED'
  | 'ON_HOLD';

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_by: string;
  assigned_to: string;
  priority: TaskPriority;
  start_date: string | null;
  deadline: string | null;
  status: TaskStatus;
  remarks: string;
  delay_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  message: string;
  task_id: string | null;
  read_status: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  task_id: string | null;
  user_id: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// --- Display metadata --------------------------------------------------------

export const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_REVIEW: 'Waiting for Review',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
};

export const STATUS_ORDER: TaskStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'WAITING_FOR_REVIEW',
  'ON_HOLD',
  'COMPLETED',
];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const ON_HOLD_REASONS = [
  'Waiting for client information',
  'Need clarification',
  'Technical issue',
  'Other',
] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  partner: 'Managing Partner',
  manager: 'Manager',
  employee: 'Employee',
};
