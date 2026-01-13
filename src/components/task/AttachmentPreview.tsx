'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  FileIcon,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  FileAudio,
  FileVideo,
  File,
  X,
} from 'lucide-react';
import { formatFileSize } from '@/lib/firebase/storage';
import { cn } from '@/lib/utils';

interface AttachmentPreviewProps {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  compact?: boolean;
}

// Get file icon based on MIME type or extension
function getFileIcon(type: string, name: string) {
  const extension = name.split('.').pop()?.toLowerCase() || '';

  // Check MIME type first
  if (type.startsWith('image/')) return null; // Will show image preview
  if (type.startsWith('video/')) return <FileVideo className="h-5 w-5" />;
  if (type.startsWith('audio/')) return <FileAudio className="h-5 w-5" />;
  if (type === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;

  // Check by extension
  switch (extension) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="h-5 w-5 text-blue-500" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    case 'ppt':
    case 'pptx':
      return <FileText className="h-5 w-5 text-orange-500" />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <FileArchive className="h-5 w-5 text-yellow-600" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'html':
    case 'css':
    case 'json':
    case 'xml':
      return <FileCode className="h-5 w-5 text-purple-500" />;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
      return <FileAudio className="h-5 w-5 text-pink-500" />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
    case 'webm':
      return <FileVideo className="h-5 w-5 text-indigo-500" />;
    default:
      return <File className="h-5 w-5 text-gray-500" />;
  }
}

// Check if file type supports preview
function canPreview(type: string, name: string): 'image' | 'video' | 'audio' | 'pdf' | null {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return null;
}

export function AttachmentPreview({ id, name, url, type, size, compact = false }: AttachmentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const previewType = canPreview(type, name);
  const icon = getFileIcon(type, name);

  const handleClick = (e: React.MouseEvent) => {
    if (previewType) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={cn(
          "group flex items-center gap-2 rounded-lg border p-2 hover:bg-muted transition-colors cursor-pointer",
          compact && "p-1.5"
        )}
      >
        {type.startsWith('image/') ? (
          <img
            src={url}
            alt={name}
            className={cn(
              "rounded object-cover",
              compact ? "h-8 w-8" : "h-10 w-10"
            )}
          />
        ) : (
          <div className={cn(
            "flex items-center justify-center rounded bg-muted",
            compact ? "h-8 w-8" : "h-10 w-10"
          )}>
            {icon || <FileIcon className="h-5 w-5 text-muted-foreground" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn(
            "truncate font-medium",
            compact ? "text-[10px]" : "text-xs"
          )}>{name}</p>
          <p className={cn(
            "text-muted-foreground",
            compact ? "text-[10px]" : "text-xs"
          )}>{formatFileSize(size)}</p>
        </div>
      </a>

      {/* Preview Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2 min-w-0">
                {icon && <div className="flex-shrink-0">{icon}</div>}
                <span className="truncate font-medium">{name}</span>
                <span className="text-sm text-muted-foreground flex-shrink-0">
                  ({formatFileSize(size)})
                </span>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex-shrink-0 mr-8"
              >
                新しいタブで開く
              </a>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30">
              {previewType === 'image' && (
                <img
                  src={url}
                  alt={name}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              )}
              {previewType === 'video' && (
                <video
                  src={url}
                  controls
                  className="max-w-full max-h-[70vh] rounded"
                >
                  お使いのブラウザは動画の再生に対応していません。
                </video>
              )}
              {previewType === 'audio' && (
                <div className="w-full max-w-md p-6 bg-background rounded-lg">
                  <audio src={url} controls className="w-full">
                    お使いのブラウザは音声の再生に対応していません。
                  </audio>
                </div>
              )}
              {previewType === 'pdf' && (
                <iframe
                  src={url}
                  className="w-full h-[70vh] rounded border"
                  title={name}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact version for comment attachments
export function AttachmentPreviewCompact({ id, name, url, type, size }: AttachmentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const previewType = canPreview(type, name);
  const icon = getFileIcon(type, name);

  const handleClick = (e: React.MouseEvent) => {
    if (previewType) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs hover:bg-muted cursor-pointer"
      >
        {type.startsWith('image/') ? (
          <img src={url} alt={name} className="h-4 w-4 rounded object-cover" />
        ) : icon ? (
          <span className="h-3 w-3 flex items-center justify-center">{icon}</span>
        ) : (
          <FileIcon className="h-3 w-3" />
        )}
        <span className="max-w-[100px] truncate">{name}</span>
      </a>

      {/* Preview Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2 min-w-0">
                {icon && <div className="flex-shrink-0">{icon}</div>}
                <span className="truncate font-medium">{name}</span>
                <span className="text-sm text-muted-foreground flex-shrink-0">
                  ({formatFileSize(size)})
                </span>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex-shrink-0 mr-8"
              >
                新しいタブで開く
              </a>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30">
              {previewType === 'image' && (
                <img
                  src={url}
                  alt={name}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              )}
              {previewType === 'video' && (
                <video
                  src={url}
                  controls
                  className="max-w-full max-h-[70vh] rounded"
                >
                  お使いのブラウザは動画の再生に対応していません。
                </video>
              )}
              {previewType === 'audio' && (
                <div className="w-full max-w-md p-6 bg-background rounded-lg">
                  <audio src={url} controls className="w-full">
                    お使いのブラウザは音声の再生に対応していません。
                  </audio>
                </div>
              )}
              {previewType === 'pdf' && (
                <iframe
                  src={url}
                  className="w-full h-[70vh] rounded border"
                  title={name}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
