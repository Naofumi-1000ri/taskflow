'use client';

import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  File,
  Download,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize, getFileIcon } from '@/lib/firebase/storage';
import type { Attachment } from '@/types';

interface AttachmentSectionProps {
  attachments: Attachment[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (attachmentId: string, fileName: string) => void;
}

const FILE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  pdf: FileText,
  doc: FileText,
  excel: FileSpreadsheet,
  ppt: FileText,
  archive: File,
  file: File,
};

export function AttachmentSection({
  attachments,
  onUpload,
  onDelete,
}: AttachmentSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        await onUpload(file);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await handleFileSelect(e.dataTransfer.files);
  };

  const handleDelete = (attachment: Attachment) => {
    if (confirm(`"${attachment.name}" を削除しますか？`)) {
      onDelete(attachment.id, attachment.name);
    }
  };

  const getIcon = (mimeType: string) => {
    const iconType = getFileIcon(mimeType);
    return FILE_ICONS[iconType] || File;
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  return (
    <div className="space-y-4">
      {/* Header */}
      <h3 className="flex items-center gap-2 font-medium">
        <Paperclip className="h-4 w-4" />
        添付ファイル ({attachments.length})
      </h3>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={isUploading}
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              アップロード中...
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              ファイルをドラッグ＆ドロップ
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              ファイルを選択
            </Button>
          </div>
        )}
      </div>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = getIcon(attachment.type);

            return (
              <div
                key={attachment.id}
                className="group flex items-center gap-3 rounded-lg border p-3"
              >
                {/* Preview or Icon */}
                {isImage(attachment.type) ? (
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)} ・{' '}
                    {format(attachment.uploadedAt, 'M/d HH:mm', { locale: ja })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={attachment.name}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(attachment)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && !isUploading && (
        <p className="text-center text-sm text-muted-foreground">
          添付ファイルはまだありません
        </p>
      )}
    </div>
  );
}
