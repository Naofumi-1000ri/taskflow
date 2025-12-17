'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Comment, User } from '@/types';

interface CommentSectionProps {
  comments: Comment[];
  currentUser: User | null;
  onAddComment: (content: string) => void;
}

export function CommentSection({
  comments,
  currentUser,
  onAddComment,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <h3 className="flex items-center gap-2 font-medium">
        <MessageSquare className="h-4 w-4" />
        コメント ({comments.length})
      </h3>

      {/* Comment List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            コメントはまだありません
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {comment.authorId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.authorId}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(comment.createdAt, 'M/d HH:mm', { locale: ja })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Comment Form */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUser?.photoURL || ''} />
          <AvatarFallback>
            {currentUser?.displayName
              ? getInitials(currentUser.displayName)
              : 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="コメントを入力... (Cmd+Enterで送信)"
            rows={2}
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
            >
              <Send className="mr-1 h-4 w-4" />
              送信
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
