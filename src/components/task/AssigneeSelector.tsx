'use client';

import { useState, useEffect } from 'react';
import { User, X, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getUsersByIds, getAllUsers } from '@/lib/firebase/firestore';
import type { User as UserType } from '@/types';

interface AssigneeSelectorProps {
  assigneeIds: string[];
  onUpdate: (assigneeIds: string[]) => void;
}

export function AssigneeSelector({
  assigneeIds,
  onUpdate,
}: AssigneeSelectorProps) {
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [assignees, setAssignees] = useState<UserType[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch all users (shared workspace)
  useEffect(() => {
    getAllUsers().then(setAllUsers);
  }, []);

  // Fetch current assignees
  useEffect(() => {
    let isMounted = true;
    if (assigneeIds.length > 0) {
      getUsersByIds(assigneeIds).then((users) => {
        if (isMounted) setAssignees(users);
      });
    } else {
      Promise.resolve().then(() => {
        if (isMounted) setAssignees([]);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [assigneeIds]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleToggleAssignee = (userId: string) => {
    const newAssigneeIds = assigneeIds.includes(userId)
      ? assigneeIds.filter((id) => id !== userId)
      : [...assigneeIds, userId];
    onUpdate(newAssigneeIds);
  };

  const handleRemoveAssignee = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newAssigneeIds = assigneeIds.filter((id) => id !== userId);
    onUpdate(newAssigneeIds);
  };

  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <User className="h-5 w-5 text-muted-foreground" />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="flex cursor-pointer items-center gap-2 text-left">
            {assignees.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pl-0.5 pr-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={assignee.photoURL || ''} alt={assignee.displayName} />
                      <AvatarFallback className="text-xs">
                        {getInitials(assignee.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{assignee.displayName}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveAssignee(assignee.id, e)}
                      className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">担当者を追加</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <p className="mb-2 px-2 text-sm font-medium">担当者を選択</p>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {allUsers.length > 0 ? (
              allUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleToggleAssignee(user.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                    assigneeIds.includes(user.id) && 'bg-muted'
                  )}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  {assigneeIds.includes(user.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))
            ) : (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                ユーザーがいません
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
