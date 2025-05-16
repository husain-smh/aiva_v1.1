'use client'

import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen bg-background text-foreground flex">
      {children}
    </div>
  );
} 