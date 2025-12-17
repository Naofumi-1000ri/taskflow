'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Calendar, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getDateRange,
  generateDateColumns,
  getColumnWidth,
  calculateTaskBar,
  getMonthHeaders,
  getTodayPosition,
  formatTaskDate,
  type ViewMode,
  type DateColumn,
} from '@/lib/utils/gantt';
import type { Task, List, Label } from '@/types';

interface GanttChartProps {
  tasks: Task[];
  lists: List[];
  labels: Label[];
  onTaskClick?: (taskId: string) => void;
  onTaskUpdate?: (taskId: string, data: Partial<Task>) => void;
}

const TASK_ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;
const SIDEBAR_WIDTH = 280;

export function GanttChart({
  tasks,
  lists,
  labels,
  onTaskClick,
  onTaskUpdate,
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Get list colors map
  const listColors = useMemo(() => {
    const colors: Record<string, string> = {};
    lists.forEach((list) => {
      colors[list.id] = list.color;
    });
    return colors;
  }, [lists]);

  // Get list names map
  const listNames = useMemo(() => {
    const names: Record<string, string> = {};
    lists.forEach((list) => {
      names[list.id] = list.name;
    });
    return names;
  }, [lists]);

  // Calculate date range and columns
  const columnWidth = getColumnWidth(viewMode);
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getDateRange(tasks, viewMode),
    [tasks, viewMode]
  );
  const columns = useMemo(
    () => generateDateColumns(rangeStart, rangeEnd, viewMode),
    [rangeStart, rangeEnd, viewMode]
  );
  const monthHeaders = useMemo(
    () => getMonthHeaders(columns, viewMode),
    [columns, viewMode]
  );
  const totalWidth = columns.length * columnWidth;
  const todayPosition = getTodayPosition(rangeStart, viewMode, columnWidth);

  // Sort tasks by list order and then by order within list
  const sortedTasks = useMemo(() => {
    const listOrderMap = new Map(lists.map((l, i) => [l.id, i]));
    return [...tasks].sort((a, b) => {
      const listOrderA = listOrderMap.get(a.listId) ?? 0;
      const listOrderB = listOrderMap.get(b.listId) ?? 0;
      if (listOrderA !== listOrderB) return listOrderA - listOrderB;
      return a.order - b.order;
    });
  }, [tasks, lists]);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && todayPosition > 0) {
      const containerWidth = scrollRef.current.clientWidth - SIDEBAR_WIDTH;
      const scrollTo = todayPosition - containerWidth / 2;
      scrollRef.current.scrollLeft = Math.max(0, scrollTo);
    }
  }, [todayPosition]);

  const handleScrollToToday = () => {
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth - SIDEBAR_WIDTH;
      const scrollTo = todayPosition - containerWidth / 2;
      scrollRef.current.scrollTo({
        left: Math.max(0, scrollTo),
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">日</SelectItem>
              <SelectItem value="week">週</SelectItem>
              <SelectItem value="month">月</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleScrollToToday}>
            <Calendar className="mr-2 h-4 w-4" />
            今日
          </Button>
        </div>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-sm">
            {lists.slice(0, 5).map((list) => (
              <div key={list.id} className="flex items-center gap-1">
                <div
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: list.color }}
                />
                <span className="text-muted-foreground">{list.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}
        <div
          className="flex-shrink-0 border-r bg-background"
          style={{ width: SIDEBAR_WIDTH }}
        >
          {/* Sidebar Header */}
          <div
            className="border-b bg-muted/50 px-3 font-medium"
            style={{ height: HEADER_HEIGHT }}
          >
            <div className="flex h-full items-center">タスク名</div>
          </div>

          {/* Sidebar Tasks */}
          <div className="overflow-hidden">
            {sortedTasks.map((task) => {
              const taskLabels = labels.filter((l) =>
                task.labelIds.includes(l.id)
              );

              return (
                <div
                  key={task.id}
                  className="flex cursor-pointer items-center gap-2 border-b px-3 hover:bg-muted/50"
                  style={{ height: TASK_ROW_HEIGHT }}
                  onClick={() => onTaskClick?.(task.id)}
                >
                  <div
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: listColors[task.listId] }}
                  />
                  <span
                    className={cn(
                      'flex-1 truncate text-sm',
                      task.isCompleted && 'text-muted-foreground line-through'
                    )}
                  >
                    {task.title}
                  </span>
                  {taskLabels.slice(0, 2).map((label) => (
                    <Badge
                      key={label.id}
                      variant="outline"
                      className="h-5 px-1 text-xs"
                      style={{
                        borderColor: label.color,
                        color: label.color,
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Timeline */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onScroll={handleScroll}
        >
          <div style={{ width: totalWidth, minHeight: '100%' }}>
            {/* Header */}
            <div
              className="sticky top-0 z-10 border-b bg-background"
              style={{ height: HEADER_HEIGHT }}
            >
              {/* Month Row */}
              <div className="flex border-b" style={{ height: 28 }}>
                {monthHeaders.map((header, i) => (
                  <div
                    key={i}
                    className="border-r px-2 text-xs font-medium"
                    style={{ width: header.span * columnWidth }}
                  >
                    {header.month}
                  </div>
                ))}
              </div>

              {/* Date Row */}
              <div className="flex" style={{ height: 32 }}>
                {columns.map((col, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex flex-col items-center justify-center border-r text-xs',
                      col.isToday && 'bg-primary/10 font-bold text-primary',
                      col.isWeekend && !col.isToday && 'bg-muted/30'
                    )}
                    style={{ width: columnWidth }}
                  >
                    <span>{col.label}</span>
                    {col.subLabel && (
                      <span className="text-[10px] text-muted-foreground">
                        {col.subLabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Task Rows */}
            <div className="relative">
              {/* Grid Background */}
              <div className="absolute inset-0 flex">
                {columns.map((col, i) => (
                  <div
                    key={i}
                    className={cn(
                      'border-r',
                      col.isWeekend && 'bg-muted/20'
                    )}
                    style={{ width: columnWidth }}
                  />
                ))}
              </div>

              {/* Today Line */}
              {todayPosition > 0 && todayPosition < totalWidth && (
                <div
                  className="absolute z-20 w-0.5 bg-red-500"
                  style={{
                    left: todayPosition,
                    top: 0,
                    bottom: 0,
                    height: sortedTasks.length * TASK_ROW_HEIGHT,
                  }}
                />
              )}

              {/* Task Bars */}
              {sortedTasks.map((task, index) => {
                const bar = calculateTaskBar(
                  task,
                  rangeStart,
                  viewMode,
                  columnWidth
                );

                return (
                  <div
                    key={task.id}
                    className="relative border-b"
                    style={{ height: TASK_ROW_HEIGHT }}
                  >
                    {bar && (
                      <div
                        className={cn(
                          'absolute top-2 z-10 flex h-6 cursor-pointer items-center rounded px-2 text-xs text-white shadow-sm transition-opacity hover:opacity-90',
                          task.isCompleted && 'opacity-60'
                        )}
                        style={{
                          left: bar.start,
                          width: Math.max(bar.width, 24),
                          backgroundColor: listColors[task.listId] || '#6b7280',
                        }}
                        onClick={() => onTaskClick?.(task.id)}
                      >
                        <span className="truncate">
                          {formatTaskDate(task.startDate)} -{' '}
                          {formatTaskDate(task.dueDate)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
