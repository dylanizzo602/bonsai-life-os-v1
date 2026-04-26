import type { TaskStatus } from '../types';

interface StatusIndicatorProps {
  status: TaskStatus;
  dimmed?: boolean;
}

export function StatusIndicator({ status, dimmed = false }: StatusIndicatorProps) {
  const size = 20;
  const cx = size / 2;
  const cy = size / 2;
  const r = 7;

  if (status === 'completed') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transition-all duration-200">
        {/* Main circle - sage green */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={dimmed ? '#d6d3d1' : '#6b7c59'}
          className="transition-all duration-200"
        />
        {/* Checkmark */}
        <path
          d={`M ${cx - 2.5} ${cy} L ${cx - 0.5} ${cy + 2} L ${cx + 2.5} ${cy - 2}`}
          stroke="white"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  if (status === 'in_progress') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transition-all duration-200">
        {/* Main circle - navy blue */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={dimmed ? '#e7e5e4' : '#475569'}
          className="transition-all duration-200"
        />
        {/* Half-fill indicator */}
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`}
          fill="white"
          opacity="0.5"
        />
      </svg>
    );
  }

  // active, archived, deleted all show gray outline
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transition-all duration-200">
      {/* Main outline circle - warm gray */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={dimmed ? '#d6d3d1' : '#78716c'}
        strokeWidth={1.5}
        className="transition-all duration-200"
      />
    </svg>
  );
}
