'use client';

interface ProBadgeProps {
  size?: 'sm' | 'md';
}

export default function ProBadge({ size = 'md' }: ProBadgeProps) {
  const cls = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-1';
  return (
    <span className={`inline-flex items-center gap-0.5 bg-indigo-600 text-white font-semibold rounded-full ${cls} leading-none`}>
      ✨ Pro
    </span>
  );
}

interface ProGateProps {
  children: React.ReactNode;
  feature: string;
  onUpgrade?: () => void;
}

export function ProGate({ children, feature, onUpgrade }: ProGateProps) {
  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-xl backdrop-blur-sm p-3 text-center">
        <span className="text-lg mb-1">✨</span>
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">{feature}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available on Pro</p>
        {onUpgrade && (
          <button
            type="button"
            onClick={onUpgrade}
            className="text-xs font-semibold text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Upgrade to Pro
          </button>
        )}
      </div>
    </div>
  );
}
