'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAISettings } from '@/hooks/useAISettings';
import { AIProviderType } from '@/types/ai';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export function AISettingsForm() {
  const {
    provider,
    apiKey,
    model,
    isConfigured,
    providers,
    defaultModels,
    setProvider,
    setApiKey,
    setModel,
  } = useAISettings();

  const [showApiKey, setShowApiKey] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(apiKey);

  const handleProviderChange = (value: string) => {
    setProvider(value as AIProviderType);
    setLocalApiKey(''); // Reset local API key when provider changes
  };

  const handleSaveApiKey = () => {
    setApiKey(localApiKey);
  };

  const handleResetModel = () => {
    setModel(defaultModels[provider]);
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>AIプロバイダー</CardTitle>
          <CardDescription>
            使用するAIプロバイダーを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>プロバイダー</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="プロバイダーを選択" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>APIキー</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  placeholder={`${provider.toUpperCase()} APIキーを入力`}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button onClick={handleSaveApiKey} disabled={localApiKey === apiKey}>
                保存
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              APIキーはブラウザのローカルストレージに保存されます。
            </p>
          </div>

          {/* API Key Status */}
          <div className="flex items-center gap-2 rounded-md bg-muted p-3">
            {isConfigured ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">
                  APIキーが設定されています
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-600">
                  APIキーが未設定です
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>モデル設定</CardTitle>
          <CardDescription>
            使用するAIモデルを設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>モデル名</Label>
            <div className="flex gap-2">
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="モデル名を入力"
              />
              <Button
                variant="outline"
                onClick={handleResetModel}
                disabled={model === defaultModels[provider]}
              >
                デフォルトに戻す
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              デフォルト: {defaultModels[provider]}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Key Help */}
      <Card>
        <CardHeader>
          <CardTitle>APIキーの取得方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>OpenAI:</strong>{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              platform.openai.com/api-keys
            </a>
            でAPIキーを作成
          </div>
          <div>
            <strong>Anthropic:</strong>{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              console.anthropic.com/settings/keys
            </a>
            でAPIキーを作成
          </div>
          <div>
            <strong>Google (Gemini):</strong>{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              aistudio.google.com/app/apikey
            </a>
            でAPIキーを作成
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
