export function formatNumber(v) {
  if (v < 1e3) return v.toString();
  const i = Math.log10(v) / 3 | 0;
  const scaled = v / (1e3 ** i);
  const suffix = " kMBTQ"[i];
  return scaled.toFixed(2).replace(/\.?0+$/, "") + suffix;
}