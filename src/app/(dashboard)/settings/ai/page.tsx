'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AISettingsForm } from '@/components/ai/AISettingsForm';

export default function AISettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">AI設定</h1>
          <p className="text-muted-foreground">
            AIアシスタントの設定を管理します
          </p>
        </div>
      </div>

      <AISettingsForm />
    </div>
  );
}
