export function hpColor(current: number, max: number): string {
  if (max <= 0) return 'text-gray-400';
  const pct = current / max;
  if (pct > 0.5) return 'text-green-400';
  if (pct > 0.25) return 'text-yellow-400';
  return 'text-red-400';
}

export function hpBarColor(current: number, max: number): string {
  if (max <= 0) return 'bg-gray-600';
  const pct = current / max;
  if (pct > 0.5) return 'bg-green-500';
  if (pct > 0.25) return 'bg-yellow-500';
  return 'bg-red-500';
}
