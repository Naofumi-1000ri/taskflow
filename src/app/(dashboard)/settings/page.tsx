'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-muted-foreground">アプリケーションの設定を管理します</p>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>通知設定</CardTitle>
          <CardDescription>
            通知の受信方法を設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>メール通知</Label>
              <p className="text-sm text-muted-foreground">
                タスクの更新やコメントをメールで受け取る
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>期限リマインダー</Label>
              <p className="text-sm text-muted-foreground">
                タスクの期限が近づいたら通知する
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>メンション通知</Label>
              <p className="text-sm text-muted-foreground">
                コメントでメンションされたら通知する
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader>
          <CardTitle>表示設定</CardTitle>
          <CardDescription>
            画面の表示方法を設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>コンパクト表示</Label>
              <p className="text-sm text-muted-foreground">
                タスクカードを小さく表示する
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>完了タスクを非表示</Label>
              <p className="text-sm text-muted-foreground">
                完了したタスクをボードから隠す
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>言語・地域</CardTitle>
          <CardDescription>
            言語とタイムゾーンを設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>言語</Label>
              <p className="text-sm text-muted-foreground">
                アプリケーションの表示言語
              </p>
            </div>
            <span className="text-sm">日本語</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>タイムゾーン</Label>
              <p className="text-sm text-muted-foreground">
                日時の表示に使用するタイムゾーン
              </p>
            </div>
            <span className="text-sm">Asia/Tokyo (JST)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
