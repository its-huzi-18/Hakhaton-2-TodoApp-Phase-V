'use client';

import { AuthProvider } from '@/hooks/auth';
import { TasksProvider } from '@/hooks/tasks';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TasksProvider>
        {children}
      </TasksProvider>
    </AuthProvider>
  );
}