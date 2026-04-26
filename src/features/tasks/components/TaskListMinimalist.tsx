import { useState } from 'react';
import type { Task } from '../types';
import { TaskItemMinimalist } from './TaskItemMinimalist';
import { SearchIcon, FilterIcon } from './icons';

interface TaskListMinimalistProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onToggleFocus: (taskId: string) => void;
  onAddTask?: () => void;
}

export function TaskListMinimalist({ 
  tasks, 
  onStatusChange, 
  onToggleFocus,
  onAddTask 
}: TaskListMinimalistProps) {
  const [showLater, setShowLater] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Filter out completed/archived/deleted tasks and apply search
  const activeTasks = tasks.filter(t => 
    t.status !== 'completed' && 
    t.status !== 'archived' && 
    t.status !== 'deleted'
  );
  
  const filteredTasks = searchQuery
    ? activeTasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeTasks;

  // Split tasks into focused and later
  // Tasks are "focused" if they don't have is_later flag or it's explicitly false
  const focusedTasks = filteredTasks.filter(t => !t.is_later);
  const laterTasks = filteredTasks.filter(t => t.is_later);

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="flex-1 relative">
          {showSearch ? (
            <div className="relative">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 pl-9 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-800/30 focus:ring-2 focus:ring-emerald-900/10 transition-all"
                autoFocus
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-600 hover:text-stone-800 hover:border-stone-400 transition-all"
            >
              <SearchIcon className="w-3.5 h-3.5" />
              <span className="text-xs md:text-sm font-light">Search</span>
            </button>
          )}
        </div>

        {/* Filter Button */}
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-600 hover:text-stone-800 hover:border-stone-400 transition-all">
          <FilterIcon className="w-3.5 h-3.5" />
          <span className="text-xs md:text-sm font-light hidden sm:inline">Filter</span>
        </button>

        {/* Add Task Button */}
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs md:text-sm font-medium hidden sm:inline">Add</span>
          </button>
        )}
      </div>

      {/* Focused Tasks */}
      <div className="space-y-2">
        {focusedTasks.length === 0 ? (
          <div className="text-center py-8 text-stone-400 font-light text-sm">
            {searchQuery ? 'No tasks match your search' : 'No tasks to focus on right now'}
          </div>
        ) : (
          focusedTasks.map(task => (
            <TaskItemMinimalist
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onToggleFocus={onToggleFocus}
            />
          ))
        )}
      </div>

      {/* Later Section */}
      {laterTasks.length > 0 && (
        <div className="pt-4 border-t border-stone-300">
          <button
            onClick={() => setShowLater(!showLater)}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors mb-3 text-xs font-light"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showLater ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>Later ({laterTasks.length})</span>
          </button>

          {showLater && (
            <div className="space-y-1.5">
              {laterTasks.map(task => (
                <TaskItemMinimalist
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onToggleFocus={onToggleFocus}
                  dimmed
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
