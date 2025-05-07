import { GlassCard } from '@/components/ui/GlassCard';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <main className="flex-1 p-0">
        {children}
      </main>
    </div>
  );
} 