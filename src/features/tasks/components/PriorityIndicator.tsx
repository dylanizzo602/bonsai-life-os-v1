import type { TaskPriority } from '../types';

interface PriorityIndicatorProps {
  priority: TaskPriority;
  dimmed?: boolean;
}

export function PriorityIndicator({ priority, dimmed = false }: PriorityIndicatorProps) {
  const getPriorityConfig = () => {
    switch (priority) {
      case 'urgent':
        return {
          dots: 4,
          label: 'Urgent',
        };
      case 'high':
        return {
          dots: 3,
          label: 'High',
        };
      case 'medium':
        return {
          dots: 2,
          label: 'Medium',
        };
      case 'low':
        return {
          dots: 1,
          label: 'Low',
        };
      default:
        return {
          dots: 0,
          label: '',
        };
    }
  };

  const config = getPriorityConfig();

  if (priority === 'none') {
    return null;
  }

  // For dimmed tasks, show simpler indicator
  if (dimmed) {
    return (
      <div className="flex items-center gap-0.5">
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: config.dots }).map((_, i) => (
            <div
              key={i}
              className="w-0.5 h-0.5 rounded-full bg-stone-400 transition-all duration-200"
              style={{
                opacity: 0.6 - (i * 0.1),
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // For focused tasks, show full priority with labels for high/urgent
  return (
    <div className="flex items-center gap-1">
      {/* Priority dots */}
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: config.dots }).map((_, i) => (
          <div
            key={i}
            className={`w-0.5 h-0.5 rounded-full transition-all duration-200 ${
              priority === 'urgent' ? 'bg-amber-800' : 'bg-stone-500'
            }`}
            style={{
              opacity: 1 - (i * 0.2),
            }}
          />
        ))}
      </div>

      {/* Priority label - only show for high/urgent on focused tasks */}
      {(priority === 'urgent' || priority === 'high') && config.label && (
        <span className={`text-[11px] font-light ${
          priority === 'urgent' ? 'text-amber-900' : 'text-stone-600'
        }`}>
          {config.label}
        </span>
      )}
    </div>
  );
}
