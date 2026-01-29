'use client';

import { useParams } from 'next/navigation';
import { ActivityLogPanel } from '@/components/project/ActivityLogPanel';

export default function ActivityPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <div className="h-full">
      <ActivityLogPanel projectId={projectId} />
    </div>
  );
}
