'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, Search, X, Calendar, Tag, Eye, EyeOff } from 'lucide-react';
import type { Label } from '@/types';

export interface BoardFilters {
  keyword: string;
  labelIds: Set<string>;
  dueFilter: 'all' | 'today' | 'week' | 'overdue' | 'none';
  showCompleted: boolean;
}

interface BoardFilterBarProps {
  filters: BoardFilters;
  labels: Label[];
  onFiltersChange: (filters: BoardFilters) => void;
}

export function BoardFilterBar({
  filters,
  labels,
  onFiltersChange,
}: BoardFilterBarProps) {
  const hasActiveFilter =
    filters.keyword.length > 0 ||
    filters.labelIds.size > 0 ||
    filters.dueFilter !== 'all' ||
    !filters.showCompleted;

  const activeFilterCount =
    (filters.keyword.length > 0 ? 1 : 0) +
    filters.labelIds.size +
    (filters.dueFilter !== 'all' ? 1 : 0) +
    (!filters.showCompleted ? 1 : 0);

  const clearAllFilters = () => {
    onFiltersChange({
      keyword: '',
      labelIds: new Set(),
      dueFilter: 'all',
      showCompleted: true,
    });
  };

  return (
    <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
      {/* Keyword search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="タスクを検索..."
          value={filters.keyword}
          onChange={(e) =>
            onFiltersChange({ ...filters, keyword: e.target.value })
          }
          className="h-8 w-48 pl-8"
        />
        {filters.keyword && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={() => onFiltersChange({ ...filters, keyword: '' })}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Due date filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filters.dueFilter !== 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            期限
            {filters.dueFilter !== 'all' && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                1
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40" align="start">
          <div className="space-y-1">
            {[
              { value: 'all', label: 'すべて' },
              { value: 'today', label: '今日まで' },
              { value: 'week', label: '今週まで' },
              { value: 'overdue', label: '期限切れ' },
              { value: 'none', label: '期限なし' },
            ].map((option) => (
              <button
                key={option.value}
                className={`w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted ${
                  filters.dueFilter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : ''
                }`}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    dueFilter: option.value as BoardFilters['dueFilter'],
                  })
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Label filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filters.labelIds.size > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            <Tag className="mr-1.5 h-3.5 w-3.5" />
            ラベル
            {filters.labelIds.size > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {filters.labelIds.size}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48" align="start">
          <div className="space-y-1">
            {labels.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">
                ラベルがありません
              </p>
            ) : (
              labels.map((label) => (
                <label
                  key={label.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                >
                  <Checkbox
                    checked={filters.labelIds.has(label.id)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(filters.labelIds);
                      if (checked) {
                        newSet.add(label.id);
                      } else {
                        newSet.delete(label.id);
                      }
                      onFiltersChange({ ...filters, labelIds: newSet });
                    }}
                  />
                  <div
                    className="h-3 w-3 rounded"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-sm">{label.name}</span>
                </label>
              ))
            )}
            {filters.labelIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() =>
                  onFiltersChange({ ...filters, labelIds: new Set() })
                }
              >
                クリア
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Show completed toggle */}
      <Button
        variant={!filters.showCompleted ? 'default' : 'outline'}
        size="sm"
        className="h-8"
        onClick={() =>
          onFiltersChange({ ...filters, showCompleted: !filters.showCompleted })
        }
      >
        {filters.showCompleted ? (
          <Eye className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <EyeOff className="mr-1.5 h-3.5 w-3.5" />
        )}
        完了タスク
      </Button>

      {/* Clear all filters */}
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={clearAllFilters}
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          フィルターをクリア ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
