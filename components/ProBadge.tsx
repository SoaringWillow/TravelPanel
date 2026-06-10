export function ProBadge({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  return (
    <span
      className={`inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black uppercase tracking-wide rounded-full ${
        size === 'xs' ? 'text-[8px] px-1.5 py-px' : 'text-[9px] px-2 py-0.5'
      }`}
    >
      PRO
    </span>
  );
}
