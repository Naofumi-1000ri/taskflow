'use client';

import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonalMemo } from '@/components/dashboard/PersonalMemo';
import { MyTasks } from '@/components/dashboard/MyTasks';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold">
          おかえりなさい、{user?.displayName?.split(' ')[0] || 'ユーザー'}さん
        </h1>
        <p className="text-muted-foreground">
          今日も頑張りましょう
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Memo */}
        <PersonalMemo />

        {/* My Tasks */}
        <MyTasks />
      </div>
    </div>
  );
}
